import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { PaymentEmailService } from '../../services/payment-email.service';

interface Seller {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  is_active: boolean;
}

interface AdminClient {
  id: number;
  client_id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  real_estate_name?: string;
  contract_signed: boolean;
  created_at: string;
}

interface Installment {
  id: number;
  client_id: number;
  property_purchase_id?: number;
  purchase_group_id?: number | null;
  installment_number: number;
  display_order?: number;
  display_label?: string;
  amount: number;
  due_date: string;
  status: string;
}

interface Payment {
  id: number;
  installment_id?: number;
  purchase_stage_id?: number;
  property_purchase_id?: number;
  purchase_group_id?: number | null;
  payment_type?: 'installment' | 'purchase_stage' | 'abono_capital';
  client_id: number;
  amount: number;
  payment_date?: string;
  created_at: string;
  payment_method: string;
  reference_number?: string;
  status: string;
  notes?: string;
  installment_number?: number;
  stage_name?: string;
  due_date?: string;
}

interface ClientProperty {
  purchase_id: number;
  purchase_group_id?: number | null;
  purchase_group_mode?: 'individual' | 'unified';
  purchase_group_total_price?: number;
  purchase_group_property_count?: number;
  unit_identifier: string;
  model_name: string;
  full_location: string;
  final_price: number;
}

interface PurchaseFilterItem {
  type: 'group' | 'property';
  id: number;
  label: string;
  subLabel: string;
  amount: number;
  propertyCount: number;
  mode: 'individual' | 'unified';
  properties: ClientProperty[];
}

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss']
})
export class PaymentsComponent implements OnInit {
  // Step 1 – Sellers
  sellers: Seller[] = [];
  selectedSeller: Seller | null = null;
  loadingSellers = false;
  sellerSearch = '';

  // Step 2 – Clients
  clients: AdminClient[] = [];
  selectedClient: AdminClient | null = null;
  loadingClients = false;
  clientSearch = '';

  // Step 3 – Detail
  installments: Installment[] = [];
  payments: Payment[] = [];
  clientProperties: ClientProperty[] = [];
  selectedPropertyPurchaseId: number | null = null;
  selectedPurchaseGroupId: number | null = null;
  activeTab: 'installments' | 'payments' = 'installments';
  loadingDetail = false;
  sendingEmailInstallmentId: number | null = null;
  emailMessage: string | null = null;
  emailError: string | null = null;

  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private readonly authService: AuthService,
    private readonly http: HttpClient,
    private readonly paymentEmailService: PaymentEmailService
  ) {}

  ngOnInit(): void {
    this.loadSellers();
  }

  // ── Sellers ────────────────────────────────────────────────

  loadSellers(): void {
    this.loadingSellers = true;
    const headers = this.authService.getAuthHeaders();
    this.http.get<{ data: Seller[] }>(`${this.API_URL}/sellers`, { headers })
      .subscribe({
        next: (res) => { this.sellers = res.data ?? []; this.loadingSellers = false; },
        error: () => { this.loadingSellers = false; }
      });
  }

  get filteredSellers(): Seller[] {
    const q = this.sellerSearch.toLowerCase().trim();
    if (!q) return this.sellers;
    return this.sellers.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  }

  selectSeller(seller: Seller): void {
    this.selectedSeller = seller;
    this.selectedClient = null;
    this.emailMessage = null;
    this.emailError = null;
    this.clients = [];
    this.clientSearch = '';
    this.clearDetail();
    this.loadClients(seller.id);
  }

  clearSeller(): void {
    this.selectedSeller = null;
    this.emailMessage = null;
    this.emailError = null;
    this.clients = [];
    this.clientSearch = '';
    this.clearDetail();
  }

  // ── Clients ────────────────────────────────────────────────

  loadClients(sellerId: number): void {
    this.loadingClients = true;
    const headers = this.authService.getAuthHeaders();
    this.http.get<{ data: AdminClient[] }>(`${this.API_URL}/clients/all?sellerId=${sellerId}`, { headers })
      .subscribe({
        next: (res) => { this.clients = res.data ?? []; this.loadingClients = false; },
        error: () => { this.loadingClients = false; }
      });
  }

  get filteredClients(): AdminClient[] {
    const q = this.clientSearch.toLowerCase().trim();
    if (!q) return this.clients;
    return this.clients.filter(c =>
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  }

  selectClient(client: AdminClient): void {
    this.selectedClient = client;
    this.activeTab = 'installments';
    this.emailMessage = null;
    this.emailError = null;
    this.clearDetail();
    this.loadDetail(client.client_id);
  }

  clearClient(): void {
    this.selectedClient = null;
    this.emailMessage = null;
    this.emailError = null;
    this.clearDetail();
  }

  // ── Detail ─────────────────────────────────────────────────

  private clearDetail(): void {
    this.installments = [];
    this.payments = [];
    this.clientProperties = [];
    this.selectedPropertyPurchaseId = null;
    this.selectedPurchaseGroupId = null;
  }

  private loadDetail(clientId: number): void {
    this.loadingDetail = true;
    const headers = this.authService.getAuthHeaders();

    this.http.get<{ data: Installment[] }>(`${this.API_URL}/installments/client/${clientId}`, { headers })
      .subscribe({
        next: (res) => { this.installments = res.data ?? []; this.loadingDetail = false; },
        error: () => { this.loadingDetail = false; }
      });

    this.http.get<{ data: Payment[] }>(`${this.API_URL}/payments/client/${clientId}`, { headers })
      .subscribe({
        next: (res) => { this.payments = res.data ?? []; },
        error: () => {}
      });

    this.http.get<{ data: ClientProperty[] }>(`${this.API_URL}/clients/${clientId}/properties`, { headers })
      .subscribe({
        next: (res) => {
          this.clientProperties = res.data ?? [];
          const unifiedGroup = this.purchaseFilterItems.find(item => item.type === 'group');
          if (unifiedGroup) {
            this.selectPurchaseFilter(unifiedGroup);
          } else if (this.clientProperties.length > 1) {
            this.selectedPropertyPurchaseId = this.clientProperties[0].purchase_id;
          }
        },
        error: () => {}
      });
  }

  setTab(tab: 'installments' | 'payments'): void {
    this.activeTab = tab;
  }

  selectProperty(purchaseId: number | null): void {
    this.selectedPropertyPurchaseId = purchaseId;
    this.selectedPurchaseGroupId = null;
  }

  selectPurchaseFilter(item: PurchaseFilterItem): void {
    if (item.type === 'group') {
      this.selectedPurchaseGroupId = item.id;
      this.selectedPropertyPurchaseId = null;
      return;
    }
    this.selectedPurchaseGroupId = null;
    this.selectedPropertyPurchaseId = item.id;
  }

  approvePayment(paymentId: number): void {
    const headers = this.authService.getAuthHeaders();
    this.http.put(`${this.API_URL}/payments/${paymentId}/approve`, { status: 'approved' }, { headers })
      .subscribe({
        next: () => {
          const p = this.payments.find(x => x.id === paymentId);
          if (p) p.status = 'approved';
        },
        error: (e) => console.error(e)
      });
  }

  sendInstallmentEmail(installment: Installment): void {
    this.sendingEmailInstallmentId = installment.id;
    this.emailMessage = null;
    this.emailError = null;

    this.paymentEmailService.sendInstallmentEmail(installment.id).subscribe({
      next: () => {
        this.sendingEmailInstallmentId = null;
        this.emailMessage = `Correo enviado para la cuota #${installment.installment_number}.`;
      },
      error: (error) => {
        this.sendingEmailInstallmentId = null;
        this.emailError = error.message || 'No se pudo enviar el correo.';
      },
    });
  }

  rejectPayment(paymentId: number): void {
    const headers = this.authService.getAuthHeaders();
    this.http.put(`${this.API_URL}/payments/${paymentId}/approve`, { status: 'rejected' }, { headers })
      .subscribe({
        next: () => {
          const p = this.payments.find(x => x.id === paymentId);
          if (p) p.status = 'rejected';
        },
        error: (e) => console.error(e)
      });
  }

  // ── Getters ────────────────────────────────────────────────

  getSellerInitials(seller: Seller): string {
    return `${seller.first_name?.[0] ?? ''}${seller.last_name?.[0] ?? ''}`.toUpperCase();
  }

  getClientInitials(client: AdminClient): string {
    return `${client.first_name?.[0] ?? ''}${client.last_name?.[0] ?? ''}`.toUpperCase();
  }

  get filteredInstallments(): Installment[] {
    if (this.selectedPurchaseGroupId !== null) {
      return this.installments.filter(i => Number(i.purchase_group_id) === this.selectedPurchaseGroupId);
    }
    if (this.selectedPropertyPurchaseId === null) return this.installments;
    return this.installments.filter(i => i.property_purchase_id === this.selectedPropertyPurchaseId);
  }

  get filteredPayments(): Payment[] {
    if (this.selectedPurchaseGroupId !== null) {
      const instIds = new Set(this.filteredInstallments.map(i => i.id));
      const purchaseIds = new Set(this.selectedUnifiedGroup?.properties.map(p => p.purchase_id) ?? []);
      return this.payments.filter(p =>
        Number(p.purchase_group_id) === this.selectedPurchaseGroupId ||
        (p.installment_id !== undefined && instIds.has(p.installment_id)) ||
        (p.property_purchase_id !== undefined && purchaseIds.has(p.property_purchase_id))
      );
    }
    if (this.selectedPropertyPurchaseId === null) return this.payments;
    const instIds = new Set(this.filteredInstallments.map(i => i.id));
    return this.payments.filter(p =>
      (p.installment_id !== undefined && instIds.has(p.installment_id)) ||
      p.property_purchase_id === this.selectedPropertyPurchaseId
    );
  }

  get pendingReviewCount(): number {
    return this.filteredPayments.filter(p => p.status === 'pending').length;
  }

  get paidInstallments(): number {
    return this.filteredInstallments.filter(i => i.status === 'paid').length;
  }

  get pendingInstallments(): number {
    return this.filteredInstallments.filter(i => ['pending', 'overdue', 'late'].includes(i.status)).length;
  }

  get totalAmount(): number {
    return this.filteredInstallments.reduce((sum, i) => sum + Number(i.amount), 0);
  }

  get paidAmount(): number {
    return this.filteredInstallments
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + Number(i.amount), 0);
  }

  get pendingAmount(): number {
    return this.filteredInstallments
      .filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + Number(i.amount), 0);
  }

  get paidProgress(): number {
    if (this.totalAmount === 0) return 0;
    return Math.round((this.paidAmount / this.totalAmount) * 100);
  }

  get purchaseFilterItems(): PurchaseFilterItem[] {
    const items: PurchaseFilterItem[] = [];
    const grouped = new Set<number>();

    for (const prop of this.clientProperties) {
      if (this.isUnifiedProperty(prop) && prop.purchase_group_id) {
        const groupId = Number(prop.purchase_group_id);
        if (grouped.has(groupId)) continue;
        grouped.add(groupId);
        const properties = this.clientProperties.filter(p => Number(p.purchase_group_id) === groupId);
        const total = Number(prop.purchase_group_total_price ?? properties.reduce((sum, p) => sum + Number(p.final_price || 0), 0));
        items.push({
          type: 'group',
          id: groupId,
          label: 'Compra unificada',
          subLabel: `${properties.length} propiedades`,
          amount: total,
          propertyCount: properties.length,
          mode: 'unified',
          properties,
        });
        continue;
      }

      items.push({
        type: 'property',
        id: prop.purchase_id,
        label: prop.unit_identifier,
        subLabel: prop.model_name,
        amount: Number(prop.final_price || 0),
        propertyCount: 1,
        mode: 'individual',
        properties: [prop],
      });
    }

    return items;
  }

  get selectedUnifiedGroup(): PurchaseFilterItem | null {
    if (this.selectedPurchaseGroupId === null) return null;
    return this.purchaseFilterItems.find(item => item.type === 'group' && item.id === this.selectedPurchaseGroupId) ?? null;
  }

  isUnifiedProperty(prop: ClientProperty): boolean {
    return prop.purchase_group_mode === 'unified' && Number(prop.purchase_group_property_count || 0) > 1;
  }

  isPurchaseFilterActive(item: PurchaseFilterItem): boolean {
    return item.type === 'group'
      ? this.selectedPurchaseGroupId === item.id
      : this.selectedPropertyPurchaseId === item.id;
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
      case 'pending':  return 'Pendiente';
      case 'rejected': return 'Rechazado';
      default:         return status;
    }
  }

  paymentMethodLabel(method: string): string {
    switch (method) {
      case 'bank_transfer': return 'Transferencia bancaria';
      case 'deposit':       return 'Depósito';
      case 'abono_capital': return 'Abono de capital';
      default:              return method ?? '—';
    }
  }

  isAbonoPayment(pay: Payment): boolean {
    return pay.payment_type === 'abono_capital' || pay.payment_method === 'abono_capital';
  }

  isStagePayment(pay: Payment): boolean {
    return pay.payment_type === 'purchase_stage';
  }

  paymentConceptLabel(pay: Payment): string {
    if (this.isAbonoPayment(pay)) return 'Abono de Capital';
    if (this.isStagePayment(pay)) return pay.stage_name || 'Fase comercial';
    return `Cuota #${pay.installment_number ?? '-'}`;
  }
}
