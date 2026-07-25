import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

interface Installment {
  id: number;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  property_purchase_id?: number;
  created_at: string;
}

interface Payment {
  id: number;
  installment_id: number;
  amount: number;
  payment_date?: string;
  created_at: string;
  payment_method: string;
  reference_number?: string;
  status: string;
  notes?: string;
  installment_number?: number;
  due_date?: string;
  proof_cloudinary_url?: string;
  proof_file_path?: string;
  ocr_matched_template?: string;
}

interface InstallmentStats {
  totalInstallments: number;
  paidInstallments: number;
  pendingInstallments: number;
  overdueInstallments: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

interface ClientProperty {
  purchase_id: number;
  unit_identifier: string;
  model_name: string;
  full_location: string;
  final_price: number;
}

@Component({
  selector: 'app-installments',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeUrlPipe],
  templateUrl: './installments.component.html',
  styleUrls: ['./installments.component.scss']
})
export class InstallmentsComponent implements OnInit {
  installments: Installment[] = [];
  payments: Payment[] = [];
  stats: InstallmentStats = {
    totalInstallments: 0,
    paidInstallments: 0,
    pendingInstallments: 0,
    overdueInstallments: 0,
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0
  };
  loading = false;
  loadingPayments = false;
  activeTab: 'cuotas' | 'pagos' = 'cuotas';
  clientProperties: ClientProperty[] = [];
  selectedPropertyPurchaseId: number | null = null;

  // Payment modal state
  showPaymentModal = false;
  selectedInstallment: Installment | null = null;
  paymentMethod: 'bank_transfer' | 'deposit' | '' = '';
  referenceNumber = '';
  paymentNotes = '';
  paymentFile: File | null = null;
  submittingPayment = false;
  paymentError = '';
  paymentSuccess = false;
  ocrData: any = null;

  // Proof viewer modal
  showProofModal = false;
  proofUrl = '';
  proofIsPdf = false;

  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadInstallments();
    this.loadPayments();
    this.loadProperties();
  }

  loadInstallments(): void {
    this.loading = true;
    this.http.get<{ data: Installment[] }>(`${this.API_URL}/clients/installments`)
      .subscribe({
        next: (res) => {
          this.installments = (res.data ?? []).sort((a, b) =>
            a.installment_number - b.installment_number
          );
          this.calculateStats();
          this.loading = false;
        },
        error: () => { this.loading = false; }
      });
  }

  loadProperties(): void {
    this.http.get<{ data: ClientProperty[] }>(`${this.API_URL}/clients/my-properties`)
      .subscribe({
        next: (res) => {
          this.clientProperties = res.data ?? [];
          if (this.clientProperties.length > 0) {
            this.selectedPropertyPurchaseId = this.clientProperties[0].purchase_id;
            this.calculateStats();
          }
        },
        error: () => {}
      });
  }

  selectProperty(purchaseId: number): void {
    this.selectedPropertyPurchaseId = purchaseId;
    this.calculateStats();
  }

  loadPayments(): void {
    this.loadingPayments = true;
    this.http.get<{ data: Payment[] }>(`${this.API_URL}/clients/payments`)
      .subscribe({
        next: (res) => { this.payments = res.data ?? []; this.loadingPayments = false; },
        error: () => { this.loadingPayments = false; }
      });
  }

  calculateStats(): void {
    const list = this.filteredInstallments;
    const paid = list.filter(i => i.status === 'paid');
    const pending = list.filter(i =>
      i.status === 'pending' || i.status === 'pending_approval'
    );
    const overdue = list.filter(i =>
      i.status === 'overdue' || i.status === 'late'
    );
    this.stats = {
      totalInstallments: list.length,
      paidInstallments: paid.length,
      pendingInstallments: pending.length,
      overdueInstallments: overdue.length,
      totalAmount: list.reduce((s, i) => s + Number(i.amount), 0),
      paidAmount: paid.reduce((s, i) => s + Number(i.amount), 0),
      remainingAmount: [...pending, ...overdue].reduce((s, i) => s + Number(i.amount), 0)
    };
  }

  setTab(tab: 'cuotas' | 'pagos'): void {
    this.activeTab = tab;
  }

  get nextPendingInstallment(): Installment | null {
    return this.filteredInstallments.find(i =>
      i.status === 'pending' || i.status === 'overdue' || i.status === 'late'
    ) ?? null;
  }

  get overdueList(): Installment[] {
    return this.filteredInstallments.filter(i => i.status === 'overdue' || i.status === 'late');
  }

  get pendingApprovalCount(): number {
    return this.filteredPayments.filter(p => p.status === 'pending').length;
  }

  get filteredInstallments(): Installment[] {
    if (this.selectedPropertyPurchaseId === null) return this.installments;
    return this.installments.filter(i => i.property_purchase_id === this.selectedPropertyPurchaseId);
  }

  get filteredPayments(): Payment[] {
    if (this.selectedPropertyPurchaseId === null) return this.payments;
    const instIds = new Set(this.filteredInstallments.map(i => i.id));
    return this.payments.filter(p => instIds.has(p.installment_id));
  }

  get paidProgress(): number {
    if (this.stats.totalAmount === 0) return 0;
    return Math.round((this.stats.paidAmount / this.stats.totalAmount) * 100);
  }

  getDaysUntilDue(dueDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  getDaysLabel(inst: Installment): string {
    const days = this.getDaysUntilDue(inst.due_date);
    if (days < 0) return `Vencida hace ${Math.abs(days)} día(s)`;
    if (days === 0) return 'Vence hoy';
    return `Vence en ${days} día(s)`;
  }

  getDaysClass(inst: Installment): string {
    const days = this.getDaysUntilDue(inst.due_date);
    if (days < 0) return 'days-overdue';
    if (days <= 7) return 'days-urgent';
    return 'days-ok';
  }

  canRegisterPayment(inst: Installment): boolean {
    if (inst.status !== 'pending' && inst.status !== 'overdue' && inst.status !== 'late') return false;
    // Only allow the first unpaid installment in order (sequential enforcement)
    const samePurchase = this.installments.filter(
      i => i.property_purchase_id === inst.property_purchase_id
    );
    const hasEarlierUnpaid = samePurchase.some(
      i => i.installment_number < inst.installment_number &&
           (i.status === 'pending' || i.status === 'overdue' || i.status === 'late')
    );
    return !hasEarlierUnpaid;
  }

  viewProof(pay: Payment): void {
    const url = pay.proof_cloudinary_url || pay.proof_file_path;
    if (!url) return;
    this.proofUrl = url;
    this.proofIsPdf = url.toLowerCase().includes('.pdf') ||
                      url.toLowerCase().includes('/raw/') ||
                      (pay.proof_cloudinary_url ?? '').includes('/raw/');
    this.showProofModal = true;
  }

  closeProofModal(): void {
    this.showProofModal = false;
    this.proofUrl = '';
  }

  openPaymentModal(inst: Installment): void {
    this.selectedInstallment = inst;
    this.paymentMethod = '';
    this.referenceNumber = '';
    this.paymentNotes = '';
    this.paymentFile = null;
    this.paymentError = '';
    this.paymentSuccess = false;
    this.ocrData = null;
    this.showPaymentModal = true;
  }

  closeModal(): void {
    if (this.submittingPayment) return;
    this.showPaymentModal = false;
    this.selectedInstallment = null;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.paymentFile = input.files?.[0] ?? null;
  }

  submitPayment(): void {
    if (!this.selectedInstallment || !this.paymentMethod) return;
    this.submittingPayment = true;
    this.paymentError = '';
    const formData = new FormData();
    formData.append('installmentId', String(this.selectedInstallment.id));
    formData.append('amount', String(this.selectedInstallment.amount));
    formData.append('paymentMethod', this.paymentMethod);
    if (this.referenceNumber) formData.append('referenceNumber', this.referenceNumber);
    if (this.paymentNotes) formData.append('notes', this.paymentNotes);
    if (this.paymentFile) formData.append('proof', this.paymentFile);

    this.http.post<{ data: Payment; ocr_data: any }>(`${this.API_URL}/payments/submit`, formData)
      .subscribe({
        next: (res) => {
          this.submittingPayment = false;
          this.paymentSuccess = true;
          this.ocrData = res.ocr_data || null;
          const inst = this.installments.find(i => i.id === this.selectedInstallment!.id);
          if (inst) inst.status = 'pending_approval';
          this.calculateStats();
          this.loadPayments();
          setTimeout(() => this.closeModal(), 3500);
        },
        error: (e) => {
          this.submittingPayment = false;
          this.paymentError = e.error?.error || 'Error al registrar el pago. Intenta de nuevo.';
        }
      });
  }

  installmentStatusClass(status: string): string {
    switch (status) {
      case 'paid':             return 'badge-paid';
      case 'pending':          return 'badge-pending';
      case 'pending_approval': return 'badge-review';
      case 'overdue':          return 'badge-overdue';
      case 'late':             return 'badge-late';
      default:                 return 'badge-default';
    }
  }

  installmentStatusLabel(status: string): string {
    switch (status) {
      case 'paid':             return 'Pagada';
      case 'pending':          return 'Pendiente';
      case 'pending_approval': return 'En revisión';
      case 'overdue':          return 'Vencida';
      case 'late':             return 'Atrasada';
      default:                 return status;
    }
  }

  paymentStatusClass(status: string): string {
    switch (status) {
      case 'approved': return 'badge-paid';
      case 'pending':  return 'badge-review';
      case 'rejected': return 'badge-overdue';
      default:         return 'badge-default';
    }
  }

  paymentStatusLabel(status: string): string {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'pending':  return 'En revisión';
      case 'rejected': return 'Rechazado';
      default:         return status;
    }
  }

  paymentMethodLabel(method: string): string {
    switch (method) {
      case 'bank_transfer': return 'Transferencia bancaria';
      case 'deposit':       return 'Depósito';
      default:              return method ?? '—';
    }
  }
}
