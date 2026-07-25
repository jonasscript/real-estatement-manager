import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CreatePropertyData, PropertyService, Property as PropertyInterface } from '../../services/real-estate.service';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';
import { PropertyModel, PropertyModelService } from '../../services/property-model.service';
import { Unit, UnitService } from '../../services/unit.service';
import { PropertyStatus, PropertyStatusService } from '../../services/property-status.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CreationWizardComponent } from '../../admin/creation-wizard/creation-wizard.component';
import { PropertyStageOverride, PurchaseStageService, StageValueType } from '../../services/purchase-stage.service';

interface EditablePropertyStageOverride extends PropertyStageOverride {
  effectiveValueType: StageValueType;
  effectiveValue: number;
  effectiveRequiresPayment: boolean;
  effectiveRequiresApproval: boolean;
  effectiveBlocksNextStage: boolean;
}

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DialogModule, ButtonModule, CreationWizardComponent],
  templateUrl: './properties.component.html',
  styleUrls: ['./properties.component.scss']
})
export class PropertiesComponent implements OnInit {
  properties: PropertyInterface[] = [];
  filteredProperties: PropertyInterface[] = [];
  propertyModels: PropertyModel[] = [];
  units: Unit[] = [];
  propertyStatuses: PropertyStatus[] = [];

  loading = false;
  showCreateDialog = false;
  showWizardModal = false;
  showEditDialog = false;
  showModelDetailDialog = false;
  showStageOverridesDialog = false;
  selectedModelDetail: PropertyModel | null = null;
  selectedStageProperty: PropertyInterface | null = null;
  propertyStageOverrides: EditablePropertyStageOverride[] = [];
  stageOverridesLoading = false;
  stageOverridesSaving = false;
  stageOverridesError = '';
  editingProperty: PropertyInterface | null = null;
  selectedRealEstateId: number | null = null;

  searchTerm = '';
  statusFilter = '';
  saleStatusFilter = '';
  typeFilter = '';

  canCreateProperties = false;
  canEditProperties = false;
  canDeleteProperties = false;
  canViewProperties = false;

  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private readonly propertyService: PropertyService,
    private readonly authService: AuthService,
    private readonly permissionService: PermissionService,
    private readonly propertyModelService: PropertyModelService,
    private readonly unitService: UnitService,
    private readonly propertyStatusService: PropertyStatusService,
    private readonly purchaseStageService: PurchaseStageService,
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute
  ) {
    this.createForm = this.fb.group({
      propertyModelId: ['', [Validators.required]],
      unitId: ['', [Validators.required]],
      propertyStatusId: [null],
      landAreaSqm: [null, [Validators.min(0)]],
      useModelLandArea: [false],
      customPrice: [null, [Validators.min(0)]],
      customDownPaymentPercentage: [null, [Validators.min(0), Validators.max(100)]],
      customInstallments: [null, [Validators.min(1)]],
      notes: ['']
    });

    this.editForm = this.fb.group({
      propertyModelId: ['', [Validators.required]],
      unitId: ['', [Validators.required]],
      propertyStatusId: ['', [Validators.required]],
      landAreaSqm: [null, [Validators.min(0)]],
      useModelLandArea: [false],
      customPrice: [null, [Validators.min(0)]],
      customDownPaymentPercentage: [null, [Validators.min(0), Validators.max(100)]],
      customInstallments: [null, [Validators.min(1)]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadPermissions();
    this.loadCatalogs();

    this.route.queryParams.subscribe(params => {
      this.selectedRealEstateId = params['realEstateId'] ? Number.parseInt(params['realEstateId'], 10) : null;
      this.loadProperties();
    });
  }

  loadCatalogs(): void {
    this.propertyModelService.getAll().subscribe({
      next: (response) => {
        this.propertyModels = response.data || [];
      },
      error: (error) => console.error('Error loading property models:', error)
    });

    this.unitService.getAll().subscribe({
      next: (response) => {
        this.units = response.data || [];
      },
      error: (error) => console.error('Error loading units:', error)
    });

    this.propertyStatusService.getAllPropertyStatuses().subscribe({
      next: (response) => {
        this.propertyStatuses = (response.data as PropertyStatus[]) || [];
        const defaultStatusId = this.getDefaultConstructionStatusId();
        this.createForm.patchValue({ propertyStatusId: defaultStatusId });
      },
      error: (error) => console.error('Error loading property statuses:', error)
    });
  }

  loadProperties(): void {
    this.loading = true;
    const currentUser = this.authService.currentUser;

    if (!currentUser?.real_estate_id) {
      console.error('User does not have a real estate assigned');
      this.loading = false;
      return;
    }

    this.propertyService.getPropertiesByRealEstate(currentUser.real_estate_id).subscribe({
      next: (response) => {
        this.properties = response.data;
        this.updateFilteredProperties();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading properties:', error);
        this.loading = false;
      }
    });
  }

  loadPermissions(): void {
    this.permissionService.loadUserPermissions().subscribe({
      next: (permissions) => {
        this.canCreateProperties = permissions.some(p => p.component_name === 'properties' && p.action === 'create');
        this.canEditProperties = permissions.some(p => p.component_name === 'properties' && p.action === 'edit');
        this.canDeleteProperties = permissions.some(p => p.component_name === 'properties' && p.action === 'delete');
        this.canViewProperties = permissions.some(p => p.component_name === 'properties' && p.action === 'view');
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
        this.canCreateProperties = false;
        this.canEditProperties = false;
        this.canDeleteProperties = false;
        this.canViewProperties = false;
      }
    });
  }

  onCreate(): void {
    if (this.loading) {
      return;
    }

    if (!this.createForm.valid) {
      return;
    }

    this.loading = true;
    const payload = this.buildPayload(this.createForm.value, true);

    this.propertyService.createProperty(payload).subscribe({
      next: (response) => {
        this.properties.unshift(response.data);
        this.updateFilteredProperties();
        this.cancelCreate();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error creating property:', error);
        this.loading = false;
      }
    });
  }

  onUpdate(): void {
    if (this.loading) {
      return;
    }

    if (!this.editForm.valid || !this.editingProperty) {
      return;
    }

    this.loading = true;
    const payload = this.buildPayload(this.editForm.value, false);

    this.propertyService.updateProperty(this.editingProperty.id, payload).subscribe({
      next: (response) => {
        const index = this.properties.findIndex(p => p.id === this.editingProperty?.id);
        if (index !== -1) {
          this.properties[index] = response.data;
        }
        this.updateFilteredProperties();
        this.cancelEdit();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error updating property:', error);
        this.loading = false;
      }
    });
  }

  private buildPayload(formValue: any, applyDefaultStatus: boolean): CreatePropertyData {
    let propertyStatusId: number | undefined;
    if (formValue.propertyStatusId) {
      propertyStatusId = Number(formValue.propertyStatusId);
    } else if (applyDefaultStatus) {
      propertyStatusId = 1;
    }

    const payload: CreatePropertyData = {
      propertyModelId: Number(formValue.propertyModelId),
      unitId: Number(formValue.unitId),
      propertyStatusId,
      landAreaSqm: this.toNullableNumber(formValue.landAreaSqm),
      customPrice: this.toNullableNumber(formValue.customPrice),
      customDownPaymentPercentage: this.toNullableNumber(formValue.customDownPaymentPercentage),
      customInstallments: this.toNullableInteger(formValue.customInstallments),
      notes: formValue.notes?.trim() || undefined
    };

    return payload;
  }

  private toNullableNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? undefined : numericValue;
  }

  private toNullableInteger(value: any): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const numericValue = Number.parseInt(value, 10);
    return Number.isNaN(numericValue) ? undefined : numericValue;
  }

  onDelete(property: PropertyInterface): void {
    if (confirm(`¿Seguro que deseas eliminar la propiedad #${property.id}?`)) {
      this.loading = true;
      this.propertyService.deleteProperty(property.id).subscribe({
        next: () => {
          this.properties = this.properties.filter(p => p.id !== property.id);
          this.updateFilteredProperties();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error deleting property:', error);
          this.loading = false;
        }
      });
    }
  }

  deleteProperty(id: number): void {
    const property = this.properties.find(p => p.id === id);
    if (property) {
      this.onDelete(property);
    }
  }

  openModelDetail(property: PropertyInterface): void {
    const model = this.propertyModels.find(m => m.id === property.property_model_id) || null;
    this.selectedModelDetail = model;
    this.showModelDetailDialog = true;
  }

  openStageOverrides(property: PropertyInterface): void {
    this.selectedStageProperty = property;
    this.propertyStageOverrides = [];
    this.stageOverridesError = '';
    this.stageOverridesLoading = true;
    this.showStageOverridesDialog = true;

    this.purchaseStageService.getPropertyOverrides(property.id).subscribe({
      next: (response) => {
        this.propertyStageOverrides = (response.data || []).map(stage => ({
          ...stage,
          effectiveValueType: stage.value_type || stage.default_value_type,
          effectiveValue: Number(stage.value ?? stage.default_value ?? 0),
          effectiveRequiresPayment: stage.requires_payment ?? stage.default_requires_payment,
          effectiveRequiresApproval: stage.requires_approval ?? stage.default_requires_approval,
          effectiveBlocksNextStage: stage.blocks_next_stage ?? stage.default_blocks_next_stage,
          is_active: stage.is_active
        }));
        this.stageOverridesLoading = false;
      },
      error: (error) => {
        console.error('Error loading stage overrides:', error);
        this.stageOverridesError = 'No se pudieron cargar las fases de esta propiedad.';
        this.stageOverridesLoading = false;
      }
    });
  }

  closeStageOverrides(): void {
    if (this.stageOverridesSaving) return;
    this.showStageOverridesDialog = false;
    this.selectedStageProperty = null;
    this.propertyStageOverrides = [];
    this.stageOverridesError = '';
  }

  saveStageOverrides(): void {
    if (!this.selectedStageProperty) return;
    this.stageOverridesSaving = true;
    this.stageOverridesError = '';
    const overrides = this.propertyStageOverrides.map(stage => ({
      stageDefinitionId: stage.stage_definition_id,
      valueType: stage.effectiveValueType,
      value: Number(stage.effectiveValue || 0),
      requiresPayment: stage.effectiveRequiresPayment,
      requiresApproval: stage.effectiveRequiresApproval,
      blocksNextStage: stage.effectiveBlocksNextStage,
      isActive: stage.is_active
    }));

    this.purchaseStageService.updatePropertyOverrides(this.selectedStageProperty.id, overrides).subscribe({
      next: () => {
        this.stageOverridesSaving = false;
        this.closeStageOverrides();
      },
      error: (error) => {
        console.error('Error saving stage overrides:', error);
        this.stageOverridesError = 'No se pudieron guardar los overrides de fases.';
        this.stageOverridesSaving = false;
      }
    });
  }

  openCreateDialog(): void {
    this.showCreateDialog = true;
  }

  openWizardModal(): void {
    this.showWizardModal = true;
  }

  onWizardComplete(): void {
    this.showWizardModal = false;
    this.loadProperties();
  }

  cancelCreate(): void {
    this.showCreateDialog = false;
    this.createForm.reset({ propertyStatusId: this.getDefaultConstructionStatusId(), useModelLandArea: false });
  }

  openEditDialog(property: PropertyInterface): void {
    this.editingProperty = property;
    this.editForm.patchValue({
      propertyModelId: property.property_model_id,
      unitId: property.unit_id,
      propertyStatusId: property.property_status_id,
      landAreaSqm: property.land_area_sqm ?? null,
      useModelLandArea: false,
      customPrice: property.custom_price,
      customDownPaymentPercentage: property.custom_down_payment_percentage,
      customInstallments: property.custom_installments,
      notes: property.notes || ''
    });
    this.showEditDialog = true;
  }

  cancelEdit(): void {
    this.showEditDialog = false;
    this.editingProperty = null;
  }

  updateFilteredProperties(): void {
    this.filteredProperties = [...this.properties];
    this.applyFilters();
  }

  getAvailablePropertiesCount(): number {
    return this.properties.filter(p => (p.sale_status || 'available') === 'available').length;
  }

  getSoldPropertiesCount(): number {
    return this.properties.filter(p => p.sale_status === 'sold').length;
  }

  getTotalValue(): number {
    return this.properties.reduce((total, property) => total + (property.custom_price || 0), 0);
  }

  onSearch(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.properties];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(property =>
        this.normalizeText(property.model_name).includes(term) ||
        this.normalizeText(property.unit_identifier).includes(term) ||
        this.normalizeText(property.block_name).includes(term) ||
        this.normalizeText(property.phase_name).includes(term) ||
        this.normalizeText(property.notes).includes(term)
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter(property => property.property_status_id === Number(this.statusFilter));
    }

    if (this.saleStatusFilter) {
      filtered = filtered.filter(property => (property.sale_status || 'available') === this.saleStatusFilter);
    }

    if (this.typeFilter) {
      filtered = filtered.filter(property => this.normalizeText(property.property_type) === this.normalizeText(this.typeFilter));
    }

    this.filteredProperties = filtered;
  }

  getPropertyTypeClass(type?: string): string {
    const normalizedType = this.normalizeText(type);
    const classes: { [key: string]: string } = {
      'casa': 'type-house',
      'departamento': 'type-apartment',
      'terreno': 'type-land',
      'local': 'type-commercial'
    };
    return classes[normalizedType] || 'type-default';
  }

  getStatusClass(status?: string): string {
    const normalizedStatus = this.normalizeText(status);
    const classes: { [key: string]: string } = {
      'disponible': 'status-available',
      'vendido': 'status-sold',
      'reservado': 'status-reserved',
      'en construcción': 'status-construction',
      'en construccion': 'status-construction',
      'planificación': 'status-planning',
      'planificacion': 'status-planning',
      'en acabados': 'status-construction',
      'lista para entrega': 'status-available'
    };
    return classes[normalizedStatus] || 'status-default';
  }

  get constructionStatuses(): PropertyStatus[] {
    return this.propertyStatuses.filter(status => !this.isSaleLifecycleStatus(status.name));
  }

  getSaleStatusLabel(saleStatus?: string): string {
    const labels: { [key: string]: string } = {
      available: 'Disponible',
      reserved: 'Reservado',
      sold: 'Vendido'
    };

    return labels[saleStatus || 'available'] || 'Disponible';
  }

  getSaleStatusClass(saleStatus?: string): string {
    return this.getStatusClass(this.getSaleStatusLabel(saleStatus));
  }

  getUnitDisplay(property: PropertyInterface): string {
    return property.unit_number || property.unit_identifier || `Unidad ${property.unit_id}`;
  }

  getSelectedModelName(formType: 'create' | 'edit'): string {
    const form = formType === 'create' ? this.createForm : this.editForm;
    const selectedModelId = Number(form.get('propertyModelId')?.value);

    if (!selectedModelId) {
      return 'Sin modelo seleccionado';
    }

    const selectedModel = this.propertyModels.find(model => model.id === selectedModelId);
    return selectedModel?.name || 'Sin modelo seleccionado';
  }

  onPropertyModelSelectionChange(formType: 'create' | 'edit'): void {
    const form = formType === 'create' ? this.createForm : this.editForm;
    if (!form.get('useModelLandArea')?.value) {
      return;
    }
    this.applyModelLandArea(formType);
  }

  onUseModelLandAreaToggle(formType: 'create' | 'edit'): void {
    const form = formType === 'create' ? this.createForm : this.editForm;
    const useModelLandArea = !!form.get('useModelLandArea')?.value;

    if (useModelLandArea) {
      this.applyModelLandArea(formType);
      return;
    }

    form.patchValue({ landAreaSqm: null });
  }

  private getDefaultConstructionStatusId(): number | null {
    return this.constructionStatuses.find(status => this.normalizeText(status.name) === 'en construccion')?.id
      || this.constructionStatuses.find(status => this.normalizeText(status.name) === 'planificacion')?.id
      || this.constructionStatuses[0]?.id
      || null;
  }

  private isSaleLifecycleStatus(statusName?: string): boolean {
    return ['disponible', 'reservado', 'vendido', 'available', 'reserved', 'sold', 'comprado']
      .includes(this.normalizeText(statusName));
  }

  private applyModelLandArea(formType: 'create' | 'edit'): void {
    const form = formType === 'create' ? this.createForm : this.editForm;
    const selectedModelId = Number(form.get('propertyModelId')?.value);

    if (selectedModelId) {
      const selectedModel = this.propertyModels.find(model => model.id === selectedModelId);
      form.patchValue({
        landAreaSqm: selectedModel?.area_sqm ?? null
      });
      return;
    }

    form.patchValue({ landAreaSqm: null });
  }

  getInstallmentAmount(property: PropertyInterface): number {
    return this.calculateInstallmentAmount(
      property.custom_price,
      property.custom_down_payment_percentage,
      property.custom_installments
    );
  }

  getCreateInstallmentAmount(): number {
    return this.calculateInstallmentAmount(
      this.toNullableNumber(this.createForm.get('customPrice')?.value),
      this.toNullableNumber(this.createForm.get('customDownPaymentPercentage')?.value),
      this.toNullableInteger(this.createForm.get('customInstallments')?.value)
    );
  }

  getEditInstallmentAmount(): number {
    return this.calculateInstallmentAmount(
      this.toNullableNumber(this.editForm.get('customPrice')?.value),
      this.toNullableNumber(this.editForm.get('customDownPaymentPercentage')?.value),
      this.toNullableInteger(this.editForm.get('customInstallments')?.value)
    );
  }

  private calculateInstallmentAmount(
    customPrice?: number,
    customDownPaymentPercentage?: number,
    customInstallments?: number
  ): number {
    if (
      customPrice !== undefined &&
      customDownPaymentPercentage !== undefined &&
      customInstallments !== undefined &&
      customInstallments > 0
    ) {
      return (customPrice * customDownPaymentPercentage / 100) / customInstallments;
    }

    return 0;
  }

  getAvailablePropertyTypes(): string[] {
    const uniqueTypes = new Set<string>();
    for (const property of this.properties) {
      if (property.property_type) {
        uniqueTypes.add(property.property_type);
      }
    }
    return Array.from(uniqueTypes).sort((a, b) => a.localeCompare(b));
  }

  private normalizeText(value?: string): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
