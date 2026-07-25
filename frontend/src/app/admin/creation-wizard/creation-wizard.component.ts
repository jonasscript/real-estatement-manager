import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BlockService } from '../../services/block.service';
import { PhaseType, PhaseTypeService } from '../../services/phase-type.service';
import { PhaseService } from '../../services/phase.service';
import { PropertyModelService } from '../../services/property-model.service';
import { PropertyStatus, PropertyStatusService } from '../../services/property-status.service';
import { PropertyType, PropertyTypeService } from '../../services/property-type.service';
import { CreatePropertyData, PropertyService } from '../../services/real-estate.service';
import { CreateUnitWithPropertyData, UnitService } from '../../services/unit.service';

@Component({
  selector: 'app-creation-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './creation-wizard.component.html',
  styleUrl: './creation-wizard.component.scss'
})
export class CreationWizardComponent implements OnInit {
  @Input() isModal = false;
  @Output() wizardComplete = new EventEmitter<void>();

  currentStep = 1;
  loading = false;
  stepLoading = false;
  showSuccessModal = false;
  useCustomLandArea = false;

  phaseMode: 'create' | 'existing' = 'existing';
  blockMode: 'create' | 'existing' = 'existing';
  propertyModelMode: 'create' | 'existing' = 'existing';
  unitMode: 'create' | 'existing' = 'existing';

  phaseTypes: PhaseType[] = [];
  propertyTypes: PropertyType[] = [];
  propertyStatuses: PropertyStatus[] = [];
  phases: any[] = [];
  blocks: any[] = [];
  propertyModels: any[] = [];
  units: any[] = [];

  createdPhaseId: number | null = null;
  createdBlockId: number | null = null;
  createdPropertyModelId: number | null = null;
  createdUnitId: number | null = null;
  createdPropertyId: number | null = null;

  selectedPhaseId: number | null = null;
  selectedBlockId: number | null = null;
  selectedPropertyModelId: number | null = null;
  selectedUnitId: number | null = null;

  phaseForm: FormGroup;
  blockForm: FormGroup;
  propertyModelForm: FormGroup;
  unitForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly phaseService: PhaseService,
    private readonly phaseTypeService: PhaseTypeService,
    private readonly blockService: BlockService,
    private readonly propertyTypeService: PropertyTypeService,
    private readonly propertyModelService: PropertyModelService,
    private readonly propertyStatusService: PropertyStatusService,
    private readonly unitService: UnitService,
    private readonly propertyService: PropertyService
  ) {
    this.phaseForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      phaseTypeId: [null, [Validators.required]],
      startDate: [''],
      endDate: [''],
      isActive: [true]
    });

    this.blockForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]]
    });

    this.propertyModelForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      propertyTypeId: [null, [Validators.required]],
      areaSqm: [0, [Validators.min(0)]],
      bedrooms: [1, [Validators.min(1)]],
      bathrooms: [1, [Validators.min(1)]],
      floorPlanUrl: [''],
      isActive: [true]
    });

    this.unitForm = this.fb.group({
      unitNumber: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(20)]],
      propertyStatusId: [null, [Validators.required]],
      description: ['', [Validators.maxLength(500)]],
      // property fields
      landAreaSqm: [{ value: null, disabled: true }, [Validators.min(0)]],
      customPrice: [null, [Validators.min(0)]],
      customDownPaymentPercentage: [null, [Validators.min(0), Validators.max(100)]],
      customInstallments: [null, [Validators.min(1)]],
      notes: ['', [Validators.maxLength(1000)]]
    });
  }

  ngOnInit(): void {
    this.stepLoading = true;
    this.loadCatalogs();
    this.loadExistingHierarchy();
  }

  private loadCatalogs(): void {
    this.phaseTypeService.getAll().subscribe({
      next: (response: any) => {
        this.phaseTypes = (response.data || []).filter((item: PhaseType) => item.is_active);
      },
      error: (error: any) => console.error('Error loading phase types:', error)
    });

    this.propertyTypeService.getAllPropertyTypes().subscribe({
      next: (response: any) => {
        this.propertyTypes = response.data || [];
      },
      error: (error: any) => console.error('Error loading property types:', error)
    });

    this.propertyModelService.getAll().subscribe({
      next: (response: any) => {
        this.propertyModels = response.data || [];
        this.propertyModelMode = this.propertyModels.length ? 'existing' : 'create';
      },
      error: (error: any) => console.error('Error loading property models:', error)
    });

    this.propertyStatusService.getAllPropertyStatuses().subscribe({
      next: (response: any) => {
        this.propertyStatuses = response.data || [];
        const defaultStatusId = this.getDefaultConstructionStatusId();

        this.unitForm.patchValue({ propertyStatusId: defaultStatusId });
      },
      error: (error: any) => console.error('Error loading property statuses:', error)
    });
  }

  private loadExistingHierarchy(): void {
    this.phaseService.getAll().subscribe({
      next: (response: any) => {
        this.phases = response.data || [];
        this.phaseMode = this.phases.length ? 'existing' : 'create';
        this.stepLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading existing phases:', error);
        this.stepLoading = false;
      }
    });
  }

  private loadBlocksByPhase(phaseId: number, afterLoad?: () => void): void {
    this.stepLoading = true;
    this.blockService.getByPhase(phaseId).subscribe({
      next: (response: any) => {
        this.blocks = response.data || [];
        this.blockMode = this.blocks.length ? 'existing' : 'create';
        this.stepLoading = false;
        afterLoad?.();
      },
      error: (error: any) => {
        console.error('Error loading blocks by phase:', error);
        this.blocks = [];
        this.blockMode = 'create';
        this.stepLoading = false;
        afterLoad?.();
      }
    });
  }

  private loadUnitsByBlock(blockId: number, afterLoad?: () => void): void {
    this.stepLoading = true;
    this.unitService.getByBlock(blockId, true).subscribe({
      next: (response: any) => {
        this.units = response.data || [];
        this.unitMode = this.units.length ? 'existing' : 'create';
        this.stepLoading = false;
        afterLoad?.();
      },
      error: (error: any) => {
        console.error('Error loading units by block:', error);
        this.units = [];
        this.unitMode = 'create';
        this.stepLoading = false;
        afterLoad?.();
      }
    });
  }

  submitPhase(): void {
    if (this.phaseMode === 'existing') {
      if (!this.selectedPhaseId || this.loading || this.stepLoading) {
        return;
      }

      this.createdPhaseId = this.selectedPhaseId;
      this.loadBlocksByPhase(this.createdPhaseId, () => {
        this.currentStep = 2;
      });
      return;
    }

    if (this.phaseForm.invalid || this.loading) {
      this.phaseForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = { ...this.phaseForm.value };

    if (payload.startDate) {
      payload.startDate = new Date(payload.startDate).toISOString().split('T')[0];
    }
    if (payload.endDate) {
      payload.endDate = new Date(payload.endDate).toISOString().split('T')[0];
    }

    this.phaseService.createPhaseForSelfRealEstate(payload).subscribe({
      next: (response: any) => {
        const phaseId = Number(response.data.id);
        this.createdPhaseId = phaseId;
        this.selectedPhaseId = phaseId;
        this.phases = [response.data, ...this.phases];
        this.loading = false;
        this.loadBlocksByPhase(phaseId, () => {
          this.currentStep = 2;
        });
      },
      error: (error: any) => {
        console.error('Error creating phase:', error);
        this.loading = false;
      }
    });
  }

  submitBlock(): void {
    if (this.blockMode === 'existing') {
      if (!this.selectedBlockId || this.loading || this.stepLoading) {
        return;
      }

      this.createdBlockId = this.selectedBlockId;
      this.loadUnitsByBlock(this.createdBlockId, () => {
        this.currentStep = 3;
      });
      return;
    }

    if (this.blockForm.invalid || this.loading || !this.createdPhaseId) {
      this.blockForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = {
      ...this.blockForm.value,
      phaseId: this.createdPhaseId
    };

    this.blockService.create(payload).subscribe({
      next: (response: any) => {
        const blockId = Number(response.data.id);
        this.createdBlockId = blockId;
        this.selectedBlockId = blockId;
        this.blocks = [response.data, ...this.blocks];
        this.loading = false;
        this.loadUnitsByBlock(blockId, () => {
          this.currentStep = 3;
        });
      },
      error: (error: any) => {
        console.error('Error creating block:', error);
        this.loading = false;
      }
    });
  }

  submitPropertyModel(): void {
    if (this.propertyModelMode === 'existing') {
      if (!this.selectedPropertyModelId || this.loading) {
        return;
      }

      this.createdPropertyModelId = this.selectedPropertyModelId;
      this.autoFillLandArea();
      this.currentStep = 4;
      return;
    }

    if (this.propertyModelForm.invalid || this.loading) {
      this.propertyModelForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = { ...this.propertyModelForm.value };

    this.propertyModelService.create(payload).subscribe({
      next: (response: any) => {
        this.createdPropertyModelId = response.data.id;
        this.selectedPropertyModelId = this.createdPropertyModelId;
        this.propertyModels = [response.data, ...this.propertyModels];
        this.autoFillLandArea();
        this.currentStep = 4;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error creating property model:', error);
        this.loading = false;
      }
    });
  }

  submitUnit(): void {
    if (this.loading || !this.createdPropertyModelId) return;

    if (this.unitMode === 'existing') {
      if (!this.selectedUnitId) return;

      this.loading = true;
      const values = this.unitForm.getRawValue();

      const payload: CreatePropertyData = {
        propertyModelId: this.createdPropertyModelId,
        unitId: this.selectedUnitId,
        propertyStatusId: values.propertyStatusId || undefined,
        landAreaSqm: this.toNullableNumber(values.landAreaSqm),
        customPrice: this.toNullableNumber(values.customPrice),
        customDownPaymentPercentage: this.toNullableNumber(values.customDownPaymentPercentage),
        customInstallments: this.toNullableInteger(values.customInstallments),
        notes: values.notes?.trim() || undefined
      };

      this.propertyService.createProperty(payload).subscribe({
        next: (response: any) => {
          this.createdUnitId = this.selectedUnitId;
          this.createdPropertyId = response.data?.id ?? null;
          this.showSuccessModal = true;
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error creating property for existing unit:', error);
          this.loading = false;
        }
      });
      return;
    }

    // Create mode
    if (this.unitForm.invalid || !this.createdBlockId) {
      this.unitForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const values = this.unitForm.getRawValue();

    const payload: CreateUnitWithPropertyData = {
      unitNumber: values.unitNumber,
      blockId: this.createdBlockId,
      propertyStatusId: values.propertyStatusId || undefined,
      description: values.description?.trim() || undefined,
      propertyModelId: this.createdPropertyModelId,
      landAreaSqm: this.toNullableNumber(values.landAreaSqm),
      customPrice: this.toNullableNumber(values.customPrice),
      customDownPaymentPercentage: this.toNullableNumber(values.customDownPaymentPercentage),
      customInstallments: this.toNullableInteger(values.customInstallments),
      notes: values.notes?.trim() || undefined
    };

    this.unitService.createWithProperty(payload).subscribe({
      next: (response: any) => {
        this.createdUnitId = response.data?.unit?.id ?? response.data?.unitId ?? null;
        this.createdPropertyId = response.data?.property?.id ?? response.data?.propertyId ?? null;
        this.showSuccessModal = true;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error creating unit with property:', error);
        this.loading = false;
      }
    });
  }

  onExistingUnitChange(): void {
    if (!this.selectedUnitId) return;
    const unit = this.units.find(u => u.id === this.selectedUnitId);
    if (!unit) return;
    const statusId = unit.property_status_id ?? unit.propertyStatusId;
    if (statusId != null) {
      this.unitForm.patchValue({ propertyStatusId: statusId });
    }
  }

  get selectedModel(): any {
    if (!this.createdPropertyModelId) return null;
    return this.propertyModels.find(m => m.id === this.createdPropertyModelId) || null;
  }

  get selectedPhaseName(): string {
    const phaseId = this.createdPhaseId ?? this.selectedPhaseId;
    const phase = this.phases.find(item => Number(item.id) === Number(phaseId));

    return phase?.name || (phaseId ? `#${phaseId}` : '');
  }

  get constructionStatuses(): PropertyStatus[] {
    return this.propertyStatuses.filter(status => !this.isSaleLifecycleStatus(status.name));
  }

  toggleCustomLandArea(event: Event): void {
    this.useCustomLandArea = (event.target as HTMLInputElement).checked;
    const ctrl = this.unitForm.get('landAreaSqm');
    if (this.useCustomLandArea) {
      ctrl?.enable();
    } else {
      ctrl?.disable();
      this.autoFillLandArea();
    }
  }

  private autoFillLandArea(): void {
    const area = this.selectedModel?.area_sqm ?? this.selectedModel?.areaSqm;
    if (area != null) {
      this.unitForm.patchValue({ landAreaSqm: area });
    }
  }

  goToStep(step: number): void {
    if (this.loading || this.stepLoading || step < 1 || step > 4) {
      return;
    }

    if (step === 1) {
      this.currentStep = 1;
      return;
    }

    if (step === 2 && this.createdPhaseId) {
      this.loadBlocksByPhase(this.createdPhaseId, () => {
        this.currentStep = 2;
      });
      return;
    }

    if (step === 3 && this.createdBlockId) {
      this.currentStep = 3;
      return;
    }

    if (step === 4 && this.createdPropertyModelId) {
      if (this.createdBlockId) {
        this.loadUnitsByBlock(this.createdBlockId, () => {
          this.autoFillLandArea();
          this.currentStep = 4;
        });
      } else {
        this.autoFillLandArea();
        this.currentStep = 4;
      }
    }
  }

  navigateToProperties(): void {
    if (this.isModal) {
      this.wizardComplete.emit();
      return;
    }
    // Navigate relative to current route prefix (admin or real-estate-admin)
    const url = this.router.url;
    if (url.includes('real-estate-admin')) {
      this.router.navigate(['/real-estate-admin/properties']);
    } else {
      this.router.navigate(['/admin/units']);
    }
  }

  resetAndCreateAnother(): void {
    this.resetWizard();
  }

  resetWizard(): void {
    this.currentStep = 1;
    this.showSuccessModal = false;
    this.createdPhaseId = null;
    this.createdBlockId = null;
    this.createdPropertyModelId = null;
    this.createdUnitId = null;
    this.createdPropertyId = null;

    this.selectedPhaseId = null;
    this.selectedBlockId = null;
    this.selectedPropertyModelId = null;
    this.selectedUnitId = null;

    this.blocks = [];
    this.units = [];
    this.useCustomLandArea = false;

    this.phaseForm.reset({ isActive: true });
    this.blockForm.reset();
    this.propertyModelForm.reset({ areaSqm: 0, bedrooms: 1, bathrooms: 1, isActive: true });
    this.unitForm.reset();
    this.unitForm.get('landAreaSqm')?.disable();

    const defaultStatusId = this.getDefaultConstructionStatusId();
    this.unitForm.patchValue({ propertyStatusId: defaultStatusId });

    this.phaseMode = this.phases.length ? 'existing' : 'create';
    this.blockMode = 'existing';
    this.propertyModelMode = this.propertyModels.length ? 'existing' : 'create';
    this.unitMode = this.units.length ? 'existing' : 'create';
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

  private getDefaultConstructionStatusId(): number | null {
    const statuses = this.constructionStatuses;
    return statuses.find(status => this.normalizeText(status.name) === 'en construccion')?.id
      || statuses.find(status => this.normalizeText(status.name) === 'planificacion')?.id
      || statuses[0]?.id
      || null;
  }

  private isSaleLifecycleStatus(statusName?: string): boolean {
    return ['disponible', 'reservado', 'vendido', 'available', 'reserved', 'sold', 'comprado']
      .includes(this.normalizeText(statusName));
  }

  private normalizeText(value?: string): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
