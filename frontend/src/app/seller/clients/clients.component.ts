import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { ClientService, Client, Property, PropertyPurchaseRecord, RegisterClientData, AddPropertyPurchaseData } from '../../services/client.service';
import { ClientPurchaseStage, PurchaseStageService } from '../../services/purchase-stage.service';

interface PropertyPurchase {
  property: Property;
  usePropertyPrice: boolean;
  finalPrice: number;
  finalDownPaymentPercentage: number;
  finalInstallments: number;
}

type PurchaseMode = 'individual' | 'unified';

interface PurchaseOperationView {
  key: string;
  mode: PurchaseMode;
  anchor: PropertyPurchaseRecord;
  purchases: PropertyPurchaseRecord[];
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit {
  currentUser: any = null;
  clients: Client[] = [];
  loading = false;

  // Add Client Wizard
  showAddClientModal = false;
  currentStep = 1;
  readonly totalSteps = 3;
  clientSubmitting = false;
  submitError = '';

  // Property selection (wizard step 2)
  availableProperties: Property[] = [];
  selectedPurchases: PropertyPurchase[] = [];
  selectedPurchaseMode: PurchaseMode = 'individual';
  selectedGroupDownPaymentPercentage = 20;
  selectedGroupInstallments = 12;
  propertySearchQuery = '';
  propertiesLoading = false;

  // Client Properties modal
  showClientPropertiesModal = false;
  clientForProperties: Client | null = null;
  clientExistingPurchases: PropertyPurchaseRecord[] = [];
  clientPropertiesLoading = false;
  newPurchases: PropertyPurchase[] = [];
  newPurchaseMode: PurchaseMode = 'individual';
  newGroupDownPaymentPercentage = 20;
  newGroupInstallments = 12;
  propModalSearchQuery = '';
  addingPurchases = false;
  purchaseStagesByPurchase: Record<number, ClientPurchaseStage[]> = {};
  stagePaymentModalOpen = false;
  stagePaymentStage: ClientPurchaseStage | null = null;
  stagePaymentAmount: number | null = null;
  stagePaymentMethod = 'bank_transfer';
  stagePaymentReference = '';
  stagePaymentNotes = '';
  stagePaymentProofFile: File | null = null;
  stagePaymentSubmitting = false;
  stagePaymentError = '';
  scheduleModalOpen = false;
  schedulePurchase: PropertyPurchaseRecord | null = null;
  scheduleDownPaymentPercentage = 20;
  scheduleInstallmentsCount = 12;
  scheduleFirstInstallmentDate = '';
  scheduleSubmitting = false;
  scheduleError = '';

  // ── Abono wizard state ──────────────────────────────────────────────────
  showAbonoModal = false;
  abonoStep = 1;
  readonly abonoTotalSteps = 3;
  abonoClient: Client | null = null;
  abonoSelectedPurchase: PropertyPurchaseRecord | null = null;
  abonoType: 'reduce_amount' | 'reduce_term' = 'reduce_amount';
  abonoAmount: number | null = null;
  abonoProofFile: File | null = null;
  abonoProofPreview: string | null = null;
  abonoSubmitting = false;
  abonoError = '';
  abonoSuccess = false;

  private readonly API_URL = 'http://localhost:3000/api';

  // Forms
  personalForm: FormGroup;
  contractForm: FormGroup;

  private realEstateId: number | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly clientService: ClientService,
    private readonly purchaseStageService: PurchaseStageService,
    private readonly fb: FormBuilder,
    private readonly http: HttpClient
  ) {
    this.personalForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      idNumber: ['', [Validators.required]],
      birthday: ['', [Validators.required]],
      phone: ['']
    });

    this.contractForm = this.fb.group({
      contractDate: [''],
      contractSigned: [false]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.realEstateId = user.real_estate_id;
    }
    this.loadClients();
  }

  loadClients(): void {
    this.loading = true;
    this.clientService.getAssignedClients().subscribe({
      next: (response) => { this.clients = response.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  getClientStatus(client: Client): string {
    return client.contract_signed ? 'Contrato Firmado' : 'Pendiente';
  }

  getStatusClass(client: Client): string {
    return client.contract_signed ? 'status-signed' : 'status-pending';
  }

  getActiveClientsCount(): number {
    return this.clients.filter(c => c.contract_signed).length;
  }

  getPendingClientsCount(): number {
    return this.clients.filter(c => !c.contract_signed).length;
  }

  getPropertyStatusClass(property: Property): string {
    switch (property.status?.toLowerCase()) {
      case 'disponible': return 'status-available';
      case 'reservado': return 'status-reserved';
      case 'vendido': return 'status-sold';
      case 'en construcción': return 'status-construction';
      case 'planificación': return 'status-planning';
      default: return 'status-default';
    }
  }

  getPurchaseStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'disponible': return 'status-available';
      case 'reservado': return 'status-reserved';
      case 'vendido': return 'status-sold';
      case 'en construcción': return 'status-construction';
      case 'planificación': return 'status-planning';
      default: return 'status-default';
    }
  }

  getPurchaseDownPayment(purchase: PropertyPurchaseRecord): number {
    return (this.getOperationTotalPrice(purchase) * this.getOperationDownPaymentPercentage(purchase)) / 100;
  }

  getPurchaseFinancedAmount(purchase: PropertyPurchaseRecord): number {
    return this.getRemainingDownPaymentForPurchase(purchase);
  }

  getPurchaseMonthlyPayment(purchase: PropertyPurchaseRecord): number {
    const remainingDownPayment = this.getRemainingDownPaymentForPurchase(purchase);
    const installments = this.getOperationInstallments(purchase);
    return installments > 0 ? remainingDownPayment / installments : 0;
  }

  // ── Add Client Wizard ────────────────────────────────────────────────────

  openAddClientModal(): void {
    this.showAddClientModal = true;
    this.currentStep = 1;
    this.selectedPurchases = [];
    this.selectedPurchaseMode = 'individual';
    this.selectedGroupDownPaymentPercentage = 20;
    this.selectedGroupInstallments = 12;
    this.propertySearchQuery = '';
    this.submitError = '';
    this.personalForm.reset();
    this.contractForm.reset({ contractSigned: false });
    this.loadAvailableProperties();
  }

  closeAddClientModal(): void {
    this.showAddClientModal = false;
    this.currentStep = 1;
    this.selectedPurchases = [];
    this.selectedPurchaseMode = 'individual';
    this.selectedGroupDownPaymentPercentage = 20;
    this.selectedGroupInstallments = 12;
    this.submitError = '';
    this.personalForm.reset();
    this.contractForm.reset({ contractSigned: false });
  }

  private loadAvailableProperties(): void {
    if (!this.realEstateId) return;
    this.propertiesLoading = true;
    this.clientService.getPropertiesByRealEstate(this.realEstateId).subscribe({
      next: (response) => { this.availableProperties = response.data; this.propertiesLoading = false; },
      error: () => { this.propertiesLoading = false; }
    });
  }

  get filteredAvailableProperties(): Property[] {
    const q = this.propertySearchQuery.trim().toLowerCase();
    if (!q) return this.availableProperties;
    return this.availableProperties.filter(p =>
      p.unit_identifier?.toLowerCase().includes(q) ||
      p.model_name?.toLowerCase().includes(q) ||
      p.full_location?.toLowerCase().includes(q) ||
      p.block_name?.toLowerCase().includes(q) ||
      p.phase_name?.toLowerCase().includes(q)
    );
  }

  isPurchaseAdded(propertyId: number): boolean {
    return this.selectedPurchases.some(p => p.property.id === propertyId);
  }

  isPropertySelectable(property: Property): boolean {
    return (property.sale_status || 'available') === 'available';
  }

  addPropertyPurchase(property: Property): void {
    if (this.isPurchaseAdded(property.id)) return;
    this.selectedPurchases = [
      ...this.selectedPurchases,
      {
        property,
        usePropertyPrice: true,
        finalPrice: this.getPropertyBasePrice(property),
        finalDownPaymentPercentage: property.final_down_payment_percentage ?? 0,
        finalInstallments: property.final_installments ?? 12
      }
    ];
  }

  removePropertyPurchase(propertyId: number): void {
    this.selectedPurchases = this.selectedPurchases.filter(p => p.property.id !== propertyId);
  }

  canGoNext(): boolean {
    if (this.currentStep === 1) return this.personalForm.valid;
    if (this.currentStep === 2) {
      if (this.selectedPurchases.length === 0) return true;
      if (this.selectedPurchaseMode === 'unified') {
        return this.isGroupedPurchaseConfigValid(this.selectedPurchases, this.selectedGroupDownPaymentPercentage, this.selectedGroupInstallments);
      }
      return this.selectedPurchases.every(p => this.isPurchaseConfigValid(p));
    }
    return true;
  }

  nextStep(): void {
    if (this.currentStep === 1) { this.personalForm.markAllAsTouched(); if (!this.personalForm.valid) return; }
    if (this.currentStep === 2 && !this.canGoNext()) return;
    if (this.currentStep < this.totalSteps) this.currentStep++;
  }

  prevStep(): void {
    if (this.currentStep > 1) this.currentStep--;
  }

  getPersonalFormError(fieldName: string): string {
    const control = this.personalForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) return `${this.getFieldLabel(fieldName)} es requerido`;
      if (control.errors['email']) return 'Por favor ingresa una dirección de correo válida';
      if (control.errors['minlength']) return `${this.getFieldLabel(fieldName)} debe tener al menos ${control.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      email: 'Correo Electrónico', password: 'Contraseña', firstName: 'Nombre',
      lastName: 'Apellido', idNumber: 'Número de Cédula', birthday: 'Fecha de Nacimiento', phone: 'Teléfono'
    };
    return labels[fieldName] || fieldName;
  }

  onSubmitClient(): void {
    if (this.clientSubmitting) return;
    this.clientSubmitting = true;
    this.submitError = '';

    const formVal = this.personalForm.value;
    const contractVal = this.contractForm.value;

    const data: RegisterClientData = {
      email: formVal.email,
      password: formVal.password,
      firstName: formVal.firstName,
      lastName: formVal.lastName,
      idNumber: formVal.idNumber,
      birthday: formVal.birthday,
      phone: formVal.phone || undefined,
      propertyPurchases: this.selectedPurchases.map(p => ({
        propertyId: p.property.id,
        finalPrice: this.getPurchaseFinalPrice(p),
        finalDownPaymentPercentage: p.finalDownPaymentPercentage,
        finalInstallments: p.finalInstallments
      })),
      purchaseMode: this.selectedPurchaseMode,
      groupDownPaymentPercentage: this.selectedPurchaseMode === 'unified' ? this.selectedGroupDownPaymentPercentage : undefined,
      groupInstallments: this.selectedPurchaseMode === 'unified' ? this.selectedGroupInstallments : undefined,
      contractDate: contractVal.contractDate || undefined,
      contractSigned: contractVal.contractSigned || false
      // assignedSellerId intentionally omitted — backend resolves from JWT token
    };

    this.clientService.registerClientWithUser(data).subscribe({
      next: () => { this.clientSubmitting = false; this.closeAddClientModal(); this.loadClients(); },
      error: (err) => { this.clientSubmitting = false; this.submitError = err?.error?.error || 'Error al registrar el cliente'; }
    });
  }

  // ── Client Properties Modal ──────────────────────────────────────────────

  selectClientForProperty(client: Client): void {
    this.clientForProperties = client;
    this.clientExistingPurchases = [];
    this.newPurchases = [];
    this.newPurchaseMode = 'individual';
    this.newGroupDownPaymentPercentage = 20;
    this.newGroupInstallments = 12;
    this.propModalSearchQuery = '';
    this.showClientPropertiesModal = true;
    this.loadClientExistingPurchases(client.client_id);
    if (this.availableProperties.length === 0) {
      this.loadAvailableProperties();
    }
  }

  closeClientPropertiesModal(): void {
    this.showClientPropertiesModal = false;
    this.clientForProperties = null;
    this.clientExistingPurchases = [];
    this.newPurchases = [];
    this.newPurchaseMode = 'individual';
    this.newGroupDownPaymentPercentage = 20;
    this.newGroupInstallments = 12;
    this.propModalSearchQuery = '';
  }

  loadClientExistingPurchases(clientId: number): void {
    this.clientPropertiesLoading = true;
    this.clientService.getClientProperties(clientId).subscribe({
      next: (res) => {
        this.clientExistingPurchases = res.data;
        this.clientPropertiesLoading = false;
        this.loadStagesForPurchases(clientId);
      },
      error: () => { this.clientPropertiesLoading = false; }
    });
  }

  private loadStagesForPurchases(clientId: number): void {
    for (const purchase of this.clientExistingPurchases) {
      this.loadStagesForPurchase(clientId, purchase.purchase_id);
    }
  }

  private loadStagesForPurchase(clientId: number, purchaseId: number): void {
    this.purchaseStageService.getClientPurchaseStages(clientId, purchaseId).subscribe({
      next: (res) => {
        this.purchaseStagesByPurchase = {
          ...this.purchaseStagesByPurchase,
          [purchaseId]: res.data ?? []
        };
      },
      error: () => {
        this.purchaseStagesByPurchase = {
          ...this.purchaseStagesByPurchase,
          [purchaseId]: []
        };
      }
    });
  }

  getPurchaseStages(purchase: PropertyPurchaseRecord): ClientPurchaseStage[] {
    return this.purchaseStagesByPurchase[purchase.purchase_id] ?? [];
  }

  get clientPurchaseOperations(): PurchaseOperationView[] {
    const map = new Map<string, PurchaseOperationView>();
    for (const purchase of this.clientExistingPurchases) {
      const key = purchase.purchase_group_id ? `group-${purchase.purchase_group_id}` : `purchase-${purchase.purchase_id}`;
      const mode = purchase.purchase_group_mode === 'unified' ? 'unified' : 'individual';
      const current = map.get(key);
      if (current) {
        current.purchases.push(purchase);
      } else {
        map.set(key, { key, mode, anchor: purchase, purchases: [purchase] });
      }
    }
    return Array.from(map.values());
  }

  get clientPurchaseAnchors(): PropertyPurchaseRecord[] {
    return this.clientPurchaseOperations.map(operation => operation.anchor);
  }

  getOperationPurchases(anchor: PropertyPurchaseRecord): PropertyPurchaseRecord[] {
    const key = anchor.purchase_group_id ? `group-${anchor.purchase_group_id}` : `purchase-${anchor.purchase_id}`;
    return this.clientPurchaseOperations.find(operation => operation.key === key)?.purchases ?? [anchor];
  }

  commercialStatusLabel(status?: string): string {
    switch (status) {
      case 'prospect': return 'Potencial';
      case 'reserved': return 'Reservado';
      case 'in_process': return 'En proceso';
      case 'ready_for_schedule': return 'Listo para cuotas';
      case 'scheduled': return 'Cuotas generadas';
      case 'cancelled': return 'Cancelado';
      default: return 'Potencial';
    }
  }

  stageStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'payment_pending': return 'Pago en revisión';
      case 'approved': return 'Aprobada';
      case 'rejected': return 'Rechazada';
      case 'completed': return 'Completada';
      default: return status;
    }
  }

  stageStatusClass(status: string): string {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'stage-status-completed';
      case 'payment_pending':
        return 'stage-status-review';
      case 'rejected':
        return 'stage-status-rejected';
      default:
        return 'stage-status-pending';
    }
  }

  canRegisterStagePayment(stage: ClientPurchaseStage): boolean {
    return stage.requires_payment && !['payment_pending', 'approved', 'completed'].includes(stage.status);
  }

  canGenerateSchedule(purchase: PropertyPurchaseRecord): boolean {
    if ((purchase.purchase_group_commercial_status || purchase.commercial_status) === 'scheduled') return false;
    const stages = this.getPurchaseStages(purchase);
    if (stages.length === 0) return true;
    return stages
      .filter(stage => stage.blocks_next_stage)
      .every(stage => ['approved', 'completed'].includes(stage.status));
  }

  getStagePaidAmount(purchase: PropertyPurchaseRecord): number {
    if (purchase.purchase_group_stage_paid_amount !== undefined && purchase.purchase_group_stage_paid_amount !== null) {
      return Number(purchase.purchase_group_stage_paid_amount);
    }
    if (purchase.stage_paid_amount !== undefined && purchase.stage_paid_amount !== null) {
      return Number(purchase.stage_paid_amount);
    }
    return this.getPurchaseStages(purchase)
      .reduce((total, stage) => total + Number(stage.approved_paid_amount || 0), 0);
  }

  getRemainingDownPaymentForPurchase(purchase: PropertyPurchaseRecord, percentage?: number): number {
    if (percentage === undefined && purchase.purchase_group_remaining_down_payment_amount !== undefined && purchase.purchase_group_remaining_down_payment_amount !== null) {
      return Number(purchase.purchase_group_remaining_down_payment_amount);
    }
    const pct = Number(percentage ?? purchase.down_payment_percentage ?? this.getOperationDownPaymentPercentage(purchase) ?? 0);
    const totalDownPayment = (this.getOperationTotalPrice(purchase) * pct) / 100;
    return Math.max(totalDownPayment - this.getStagePaidAmount(purchase), 0);
  }

  getOperationTotalPrice(purchase: PropertyPurchaseRecord): number {
    return Number(purchase.purchase_group_mode === 'unified' ? purchase.purchase_group_total_price : purchase.final_price) || 0;
  }

  getOperationDownPaymentPercentage(purchase: PropertyPurchaseRecord): number {
    return Number(
      purchase.purchase_group_mode === 'unified'
        ? purchase.purchase_group_down_payment_percentage
        : purchase.final_down_payment_percentage
    ) || 0;
  }

  getOperationInstallments(purchase: PropertyPurchaseRecord): number {
    return Number(
      purchase.purchase_group_mode === 'unified'
        ? purchase.purchase_group_installments
        : purchase.final_installments
    ) || 0;
  }

  openStagePaymentModal(stage: ClientPurchaseStage): void {
    this.stagePaymentStage = stage;
    this.stagePaymentAmount = Number(stage.amount_due || 0);
    this.stagePaymentMethod = 'bank_transfer';
    this.stagePaymentReference = '';
    this.stagePaymentNotes = '';
    this.stagePaymentProofFile = null;
    this.stagePaymentError = '';
    this.stagePaymentModalOpen = true;
  }

  closeStagePaymentModal(): void {
    if (this.stagePaymentSubmitting) return;
    this.stagePaymentModalOpen = false;
    this.stagePaymentStage = null;
    this.stagePaymentProofFile = null;
    this.stagePaymentError = '';
  }

  onStagePaymentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stagePaymentProofFile = input.files?.[0] ?? null;
  }

  submitStagePayment(): void {
    if (!this.stagePaymentStage || !this.stagePaymentAmount || this.stagePaymentAmount <= 0) return;
    this.stagePaymentSubmitting = true;
    this.stagePaymentError = '';

    const formData = new FormData();
    formData.append('amount', String(this.stagePaymentAmount));
    formData.append('paymentMethod', this.stagePaymentMethod);
    formData.append('referenceNumber', this.stagePaymentReference || '');
    formData.append('notes', this.stagePaymentNotes || '');
    if (this.stagePaymentProofFile) {
      formData.append('proof', this.stagePaymentProofFile);
    }

    const stage = this.stagePaymentStage;
    this.purchaseStageService.createStagePayment(stage.id, formData).subscribe({
      next: () => {
        this.stagePaymentSubmitting = false;
        this.closeStagePaymentModal();
        if (this.clientForProperties) {
          this.loadClientExistingPurchases(this.clientForProperties.client_id);
        }
      },
      error: (err) => {
        this.stagePaymentSubmitting = false;
        this.stagePaymentError = err?.error?.error || 'No se pudo registrar el pago de la fase.';
      }
    });
  }

  openScheduleModal(purchase: PropertyPurchaseRecord): void {
    this.schedulePurchase = purchase;
    this.scheduleDownPaymentPercentage = Number(purchase.down_payment_percentage ?? this.getOperationDownPaymentPercentage(purchase) ?? 20);
    this.scheduleInstallmentsCount = Number(this.getOperationInstallments(purchase) || 12);
    this.scheduleFirstInstallmentDate = new Date().toISOString().slice(0, 10);
    this.scheduleError = '';
    this.scheduleModalOpen = true;
  }

  closeScheduleModal(): void {
    if (this.scheduleSubmitting) return;
    this.scheduleModalOpen = false;
    this.schedulePurchase = null;
    this.scheduleError = '';
  }

  get scheduleRemainingPreview(): number {
    if (!this.schedulePurchase) return 0;
    return this.getRemainingDownPaymentForPurchase(this.schedulePurchase, this.scheduleDownPaymentPercentage);
  }

  submitGenerateSchedule(): void {
    if (!this.schedulePurchase) return;
    if (this.scheduleDownPaymentPercentage < 0 || this.scheduleDownPaymentPercentage > 100 || this.scheduleInstallmentsCount < 1 || !this.scheduleFirstInstallmentDate) {
      this.scheduleError = 'Revisa el porcentaje, número de cuotas y fecha inicial.';
      return;
    }

    this.scheduleSubmitting = true;
    this.scheduleError = '';
    const purchase = this.schedulePurchase;
    this.purchaseStageService.generateDownPaymentSchedule(purchase.purchase_id, {
      downPaymentPercentage: this.scheduleDownPaymentPercentage,
      installmentsCount: this.scheduleInstallmentsCount,
      firstInstallmentDate: this.scheduleFirstInstallmentDate
    }).subscribe({
      next: () => {
        this.scheduleSubmitting = false;
        this.closeScheduleModal();
        if (this.clientForProperties) {
          this.loadClientExistingPurchases(this.clientForProperties.client_id);
        }
      },
      error: (err) => {
        this.scheduleSubmitting = false;
        this.scheduleError = err?.error?.error || 'No se pudo generar la tabla de entrada.';
      }
    });
  }

  get filteredModalProperties(): Property[] {
    const alreadyOwned = new Set([
      ...this.clientExistingPurchases.map(p => p.property_id),
      ...this.newPurchases.map(p => p.property.id)
    ]);
    const q = this.propModalSearchQuery.toLowerCase().trim();
    return this.availableProperties.filter(p => {
      if (alreadyOwned.has(p.id)) return false;
      if (!q) return true;
      return (
        p.unit_identifier?.toLowerCase().includes(q) ||
        p.model_name?.toLowerCase().includes(q) ||
        p.block_name?.toLowerCase().includes(q) ||
        p.phase_name?.toLowerCase().includes(q)
      );
    });
  }

  addNewPurchase(property: Property): void {
    this.newPurchases.push({
      property,
      usePropertyPrice: true,
      finalPrice: this.getPropertyBasePrice(property),
      finalDownPaymentPercentage: property.final_down_payment_percentage ?? 0,
      finalInstallments: property.final_installments ?? 12
    });
  }

  removeNewPurchase(propertyId: number): void {
    this.newPurchases = this.newPurchases.filter(p => p.property.id !== propertyId);
  }

  submitNewPurchases(): void {
    if (!this.clientForProperties || this.newPurchases.length === 0) return;
    if (this.newPurchaseMode === 'unified') {
      if (!this.isGroupedPurchaseConfigValid(this.newPurchases, this.newGroupDownPaymentPercentage, this.newGroupInstallments)) return;
    } else if (!this.newPurchases.every(p => this.isPurchaseConfigValid(p))) return;
    this.addingPurchases = true;
    const clientId = this.clientForProperties.client_id;
    const payload: AddPropertyPurchaseData = {
      propertyPurchases: this.newPurchases.map(p => ({
        propertyId: p.property.id,
        finalPrice: this.getPurchaseFinalPrice(p),
        finalDownPaymentPercentage: p.finalDownPaymentPercentage,
        finalInstallments: p.finalInstallments
      })),
      purchaseMode: this.newPurchaseMode,
      groupDownPaymentPercentage: this.newPurchaseMode === 'unified' ? this.newGroupDownPaymentPercentage : undefined,
      groupInstallments: this.newPurchaseMode === 'unified' ? this.newGroupInstallments : undefined
    };

    this.clientService.addPropertyToClient(clientId, payload).subscribe({
      next: () => {
        this.addingPurchases = false;
        this.newPurchases = [];
        this.newPurchaseMode = 'individual';
        this.loadClientExistingPurchases(clientId);
      },
      error: () => { this.addingPurchases = false; }
    });
  }

  getPropertyBasePrice(property: Property): number {
    return Number(property.final_price || 0);
  }

  getPurchaseFinalPrice(purchase: PropertyPurchase): number {
    return purchase.usePropertyPrice ? this.getPropertyBasePrice(purchase.property) : Number(purchase.finalPrice || 0);
  }

  onUsePropertyPriceChange(purchase: PropertyPurchase): void {
    if (purchase.usePropertyPrice) {
      purchase.finalPrice = this.getPropertyBasePrice(purchase.property);
    }
  }

  getPurchaseDownPaymentAmount(purchase: PropertyPurchase): number {
    return (this.getPurchaseFinalPrice(purchase) * Number(purchase.finalDownPaymentPercentage || 0)) / 100;
  }

  getPurchaseMonthlyAmount(purchase: PropertyPurchase): number {
    const installments = Number(purchase.finalInstallments || 0);
    return installments > 0 ? this.getPurchaseDownPaymentAmount(purchase) / installments : 0;
  }

  getPurchaseListTotal(purchases: PropertyPurchase[]): number {
    return purchases.reduce((total, purchase) => total + this.getPurchaseFinalPrice(purchase), 0);
  }

  getGroupedDownPaymentAmount(purchases: PropertyPurchase[], percentage: number): number {
    return (this.getPurchaseListTotal(purchases) * Number(percentage || 0)) / 100;
  }

  getGroupedMonthlyAmount(purchases: PropertyPurchase[], percentage: number, installments: number): number {
    const count = Number(installments || 0);
    return count > 0 ? this.getGroupedDownPaymentAmount(purchases, percentage) / count : 0;
  }

  isPurchaseConfigValid(purchase: PropertyPurchase): boolean {
    const finalPrice = this.getPurchaseFinalPrice(purchase);
    const downPayment = Number(purchase.finalDownPaymentPercentage);
    const installments = Number(purchase.finalInstallments);
    return finalPrice > 0 && downPayment >= 0 && downPayment <= 100 && Number.isInteger(installments) && installments > 0;
  }

  isGroupedPurchaseConfigValid(purchases: PropertyPurchase[], percentage: number, installments: number): boolean {
    const downPayment = Number(percentage);
    const count = Number(installments);
    return purchases.every(purchase => this.getPurchaseFinalPrice(purchase) > 0)
      && downPayment >= 0
      && downPayment <= 100
      && Number.isInteger(count)
      && count > 0;
  }

  // ── Abono wizard ────────────────────────────────────────────────────────

  openAbonoModal(client: Client): void {
    this.abonoClient = client;
    this.abonoStep = 1;
    this.abonoSelectedPurchase = null;
    this.abonoType = 'reduce_amount';
    this.abonoAmount = null;
    this.abonoProofFile = null;
    this.abonoProofPreview = null;
    this.abonoError = '';
    this.abonoSuccess = false;
    this.abonoSubmitting = false;
    // Load purchases if not already loaded
    if (this.clientForProperties?.client_id === client.client_id && this.clientExistingPurchases.length > 0) {
      this.showAbonoModal = true;
    } else {
      this.clientPropertiesLoading = true;
      this.clientService.getClientProperties(client.client_id).subscribe({
        next: (res) => {
          this.clientExistingPurchases = res.data;
          this.clientPropertiesLoading = false;
          this.showAbonoModal = true;
        },
        error: () => { this.clientPropertiesLoading = false; }
      });
    }
  }

  closeAbonoModal(): void {
    this.showAbonoModal = false;
    this.abonoClient = null;
    this.abonoSelectedPurchase = null;
    this.abonoProofFile = null;
    this.abonoProofPreview = null;
  }

  selectAbonoProperty(purchase: PropertyPurchaseRecord): void {
    this.abonoSelectedPurchase = purchase;
    this.abonoStep = 2;
  }

  abonoNextStep(): void {
    if (this.abonoStep < this.abonoTotalSteps) this.abonoStep++;
  }

  abonoPrevStep(): void {
    if (this.abonoStep > 1) this.abonoStep--;
  }

  canAbonoNext(): boolean {
    if (this.abonoStep === 1) return this.abonoSelectedPurchase !== null;
    if (this.abonoStep === 2) return !!this.abonoAmount && this.abonoAmount > 0;
    return true;
  }

  onAbonoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.abonoProofFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.abonoProofPreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  submitAbono(): void {
    if (this.abonoSubmitting || !this.abonoClient || !this.abonoSelectedPurchase || !this.abonoAmount) return;
    this.abonoSubmitting = true;
    this.abonoError = '';

    const formData = new FormData();
    formData.append('clientId', String(this.abonoClient.client_id));
    formData.append('purchaseId', String(this.abonoSelectedPurchase.purchase_id));
    formData.append('abonoAmount', String(this.abonoAmount));
    formData.append('abonoType', this.abonoType);
    if (this.abonoProofFile) {
      formData.append('proof', this.abonoProofFile);
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken() ?? ''}` });

    this.http.post(`${this.API_URL}/abono/process`, formData, { headers }).subscribe({
      next: () => {
        this.abonoSubmitting = false;
        this.abonoSuccess = true;
        this.abonoStep = this.abonoTotalSteps + 1; // success screen
      },
      error: (err) => {
        this.abonoSubmitting = false;
        this.abonoError = err?.error?.error || 'Error al procesar el abono. Intente nuevamente.';
      }
    });
  }

  abonoTypeLabel(type: string): string {
    return type === 'reduce_amount' ? 'Reducir monto de cuotas (mismo plazo)' : 'Reducir plazo (mismo monto de cuota)';
  }
}
