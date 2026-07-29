import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface PaymentEmailResponse {
  message: string;
  data: {
    id: number;
    installment_id: number;
    client_id: number;
    sent_by: number;
    recipient_email: string;
    subject: string;
    status: string;
    sent_at: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class PaymentEmailService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private readonly http: HttpClient) {}

  sendInstallmentEmail(installmentId: number): Observable<PaymentEmailResponse> {
    return this.http
      .post<PaymentEmailResponse>(`${this.API_URL}/payments/installments/${installmentId}/send-email`, {})
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'No se pudo enviar el correo';

    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else if (error.error?.error) {
      if (error.error.error === 'Real estate SES sender is not configured') {
        errorMessage = 'Configura el correo y dominio SES de la inmobiliaria antes de enviar correos.';
      } else if (error.error.error === 'SES sender email must match the configured domain') {
        errorMessage = 'El correo remitente debe pertenecer al dominio SES configurado.';
      } else {
        errorMessage = error.error.error;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
