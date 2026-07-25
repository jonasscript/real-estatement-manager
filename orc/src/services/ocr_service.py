import io
import re
import ssl
import urllib.request
from typing import Optional, Tuple

import certifi
import numpy as np
from PIL import Image, ImageEnhance

# macOS Python installers ship without system CA certs wired in.
# Patch the default SSL context so EasyOCR can download its models.
ssl._create_default_https_context = ssl.create_default_context  # noqa: SLF001
urllib.request.install_opener(
    urllib.request.build_opener(
        urllib.request.HTTPSHandler(
            context=ssl.create_default_context(cafile=certifi.where())
        )
    )
)

from src.config.settings import settings
from src.models.schemas import ExtractedPaymentData, PaymentType
from src.services.template_registry import template_registry


class OCRService:
    """
    Singleton wrapper around EasyOCR that processes payment-receipt images
    and extracts structured payment information.
    """

    _instance: Optional["OCRService"] = None
    _reader = None  # easyocr.Reader — loaded lazily to avoid heavy startup

    # ------------------------------------------------------------------
    # Singleton access
    # ------------------------------------------------------------------

    @classmethod
    def get_instance(cls) -> "OCRService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ------------------------------------------------------------------
    # EasyOCR reader
    # ------------------------------------------------------------------

    def _get_reader(self):
        if self._reader is None:
            import easyocr  # imported lazily so the module loads fast

            self._reader = easyocr.Reader(
                settings.ocr_language_list,
                gpu=settings.OCR_GPU,
            )
        return self._reader

    def is_ready(self) -> bool:
        try:
            self._get_reader()
            return True
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Core processing
    # ------------------------------------------------------------------

    def process_image(self, image_bytes: bytes) -> Tuple[str, float, list, tuple]:
        """
        Run EasyOCR on the given image bytes.

        Returns
        -------
        (full_text, avg_confidence)
        """
        reader = self._get_reader()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_array = np.array(image)

        results = reader.readtext(img_array, detail=1)

        # JEP's light grey amount rows can make EasyOCR read "$0.41" as
        # "50.41".  This targeted second pass preserves the original handling
        # of photographs and only enhances the known app layout.
        initial_text = "\n".join(text for (_, text, _) in results)
        if "JEP" in initial_text.upper() and "COMPROBANTE DE TRANSFERENCIA" in initial_text.upper():
            enhanced = np.array(ImageEnhance.Contrast(Image.fromarray(img_array)).enhance(2.0))
            enhanced_results = reader.readtext(enhanced, detail=1)
            if enhanced_results:
                results = enhanced_results
                img_array = enhanced

        # Phone photos of a thermal receipt are occasionally submitted sideways.
        # EasyOCR does not auto-rotate them, and the result is usually a stream
        # of isolated digits.  Only retry clearly unreliable reads to avoid a
        # needless performance cost for normal uploads.
        if results:
            initial_confidence = sum(conf for (_, _, conf) in results) / len(results)
            if initial_confidence < 0.60:
                best_results = results
                best_confidence = initial_confidence
                best_image = img_array
                for angle in (90, 270):
                    rotated = np.rot90(img_array, k=angle // 90)
                    candidate = reader.readtext(rotated, detail=1)
                    if not candidate:
                        continue
                    candidate_confidence = sum(conf for (_, _, conf) in candidate) / len(candidate)
                    # A material gain is required so a noisy alternative does
                    # not replace an already legible image.
                    if candidate_confidence > best_confidence + 0.08:
                        best_results = candidate
                        best_confidence = candidate_confidence
                        best_image = rotated
                results = best_results
                img_array = best_image

        if not results:
            return "", 0.0, [], (0, 0)

        texts = [text for (_, text, _) in results]
        confidences = [conf for (_, _, conf) in results]

        full_text = "\n".join(texts)
        avg_confidence = sum(confidences) / len(confidences)

        img_height, img_width = img_array.shape[:2]
        img_dims = (img_width, img_height)

        # Build sorted blocks: each block has center coords + text + confidence
        sorted_blocks = []
        for bbox, text, conf in results:
            xs = [pt[0] for pt in bbox]
            ys = [pt[1] for pt in bbox]
            cx = (min(xs) + max(xs)) / 2.0
            cy = (min(ys) + max(ys)) / 2.0
            sorted_blocks.append({"text": text, "cx": cx, "cy": cy, "conf": conf})
        # Sort top-to-bottom, left-to-right
        sorted_blocks.sort(key=lambda b: (b["cy"], b["cx"]))

        return full_text, round(avg_confidence, 4), sorted_blocks, img_dims

    def extract_payment_data(
        self,
        raw_text: str,
        confidence: float,
        sorted_blocks: list | None = None,
        img_dims: tuple | None = None,
    ) -> ExtractedPaymentData:
        template = template_registry.find_best_template(raw_text)

        def _get(field: str, fallback):
            """
            Lookup priority:
              1. Positional (layout.fields) if the template defines it
              2. Regex (fields) if the template defines it
              3. Generic fallback method
            """
            if template:
                # 1. Use a template calculation when the displayed amount can
                # be reconstructed from more reliable values.
                val = template.extract_computed_field(field, raw_text)
                if val is not None:
                    return val
                # 2. Try positional extraction first
                if field in template.layout_fields and sorted_blocks is not None:
                    val = template.extract_field_positional(field, sorted_blocks, img_dims or (0, 0))
                    if val is not None:
                        return val
                # 3. Try regex patterns
                val = template.extract_field(field, raw_text)
                if val is not None:
                    return val
                # 4. Use a value fixed by the document format (for example,
                # Ecuadorian receipts that use "$" without printing "USD").
                val = template.default_for(field)
                if val is not None:
                    return val
                if template.strict_fields:
                    return None
            return fallback(raw_text)

        # Payment type: template can hard-code it, otherwise auto-detect
        if template and template.payment_type:
            payment_type = PaymentType(template.payment_type)
        else:
            payment_type = self._detect_payment_type(raw_text)

        # Bank: prefer template's bank_name, fall back to keyword scan
        bank = template.bank_name if (template and template.bank_name) else self._extract_bank(raw_text)

        return ExtractedPaymentData(
            raw_text=raw_text,
            payment_type=payment_type,
            amount=_get("amount", self._extract_amount),
            currency=_get("currency", self._extract_currency),
            date=_get("date", self._extract_date),
            reference_number=_get("reference_number", self._extract_reference),
            origin_account=_get("origin_account", self._extract_origin_account),
            destination_account=_get("destination_account", self._extract_destination_account),
            bank=bank,
            sender_name=_get("sender_name", self._extract_sender),
            receiver_name=_get("receiver_name", self._extract_receiver),
            confidence_score=confidence,
            matched_template=template.id if template else None,
        )

    # ------------------------------------------------------------------
    # Extraction helpers
    # ------------------------------------------------------------------

    def _detect_payment_type(self, text: str) -> PaymentType:
        lower = text.lower()
        if any(kw in lower for kw in ["transferencia", "transfer", "trf", "enviado", "envio"]):
            return PaymentType.TRANSFER
        if any(kw in lower for kw in ["depósito", "deposito", "deposit", "depósito en efectivo"]):
            return PaymentType.DEPOSIT
        return PaymentType.UNKNOWN

    def _extract_amount(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:monto|importe|amount|total|valor|subtotal)[:\s$]*\$?\s*([\d,\.]+)",
            r"\$\s*([\d,\.]{3,})",
            r"([\d,\.]{3,})\s*(?:USD|MXN|COP|PEN|ARS|CLP|BRL|EUR)",
        ]
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return None

    def _extract_currency(self, text: str) -> Optional[str]:
        m = re.search(
            r"\b(USD|MXN|COP|PEN|ARS|CLP|BRL|EUR|GTQ|HNL|NIO|CRC|PAB|DOP|BOB|PYG|UYU)\b",
            text,
            re.IGNORECASE,
        )
        return m.group(1).upper() if m else None

    def _extract_date(self, text: str) -> Optional[str]:
        patterns = [
            r"\b(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})\b",
            r"\b(\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})\b",
            r"\b(\d{1,2}\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto"
            r"|septiembre|octubre|noviembre|diciembre)\s+\d{2,4})\b",
        ]
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return None

    def _extract_reference(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:referencia|ref\.?|folio|operaci[oó]n|n[uú]mero|no\.?|#)[:\s]*([A-Z0-9\-]{6,30})",
            r"(?:clave|folio)\s+(?:de\s+)?(?:rastreo|seguimiento)[:\s]*([A-Z0-9]{18,22})",
            r"(?:comprobante)[:\s#]*([A-Z0-9\-]{6,20})",
        ]
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return None

    def _extract_origin_account(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:cuenta\s+origen|origen|from\s+account|cuenta\s+emisora)[:\s]*([*\dX]{8,20})",
            r"(?:de\s+la\s+cuenta)[:\s]*([*\dX]{8,20})",
        ]
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return None

    def _extract_destination_account(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:cuenta\s+destino|destino|to\s+account|cuenta\s+beneficiaria)[:\s]*([*\dX]{8,20})",
            r"(?:a\s+la\s+cuenta)[:\s]*([*\dX]{8,20})",
            r"(?:clabe)[:\s]*(\d{18})",
        ]
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return None

    def _extract_bank(self, text: str) -> Optional[str]:
        bank_keywords = [
            # Mexico
            "BBVA", "Bancomer", "Banamex", "Citibanamex", "Santander", "HSBC",
            "Banorte", "Scotiabank", "Inbursa", "Banco Azteca", "Azteca",
            "BanBajío", "Banregio", "Afirme", "Multiva", "Bansí",
            "Hey Banco", "Nu México", "Nubank",
            # Colombia
            "Bancolombia", "Davivienda", "Daviplata", "Nequi", "Banco de Bogotá",
            "Banco Popular", "Itaú", "Colpatria",
            # Peru
            "BCP", "Interbank", "BBVA Continental", "BanBif", "Banbif",
            # Chile
            "Banco de Chile", "BancoEstado", "BCI",
            # Brazil
            "Bradesco", "Itaú", "Caixa",
            # Generic
            "Transferencia STP",
        ]
        text_upper = text.upper()
        for bank in bank_keywords:
            if bank.upper() in text_upper:
                return bank
        return None

    def _extract_sender(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:ordenante|remitente|emisor|pagador|de)[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñA-Z\s]{4,40})",
        ]
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return None

    def _extract_receiver(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:beneficiario|receptor|destinatario|para)[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñA-Z\s]{4,40})",
        ]
        for pattern in patterns:
            m = re.search(pattern, text, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return None


# Module-level singleton used by routes
ocr_service = OCRService.get_instance()
