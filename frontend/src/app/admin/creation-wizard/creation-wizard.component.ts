import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { BlockService } from '../../services/block.service';
import { PhaseType, PhaseTypeService } from '../../services/phase-type.service';
import { PhaseService } from '../../services/phase.service';
import { PropertyModelService } from '../../services/property-model.service';
import { PropertyStatus, PropertyStatusService } from '../../services/property-status.service';
import { PropertyType, PropertyTypeService } from '../../services/property-type.service';
import { CreatePropertyData, PropertyService } from '../../services/real-estate.service';
import { UnitService } from '../../services/unit.service';

@Component({
  selector: 'app-creation-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './creation-wizard.component.html',
  styleUrl: './creation-wizard.component.scss'
})
export class CreationWizardComponent implements OnInit {
  currentStep = 1;
  loading = false;
  completed = false;

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
  propertyForm: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
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
      isAvailable: [true]
    });

    this.propertyForm = this.fb.group({
      propertyStatusId: [null, [Validators.required]],
      landAreaSqm: [null, [Validators.min(0)]],
      customPrice: [null, [Validators.min(0)]],
      customDownPaymentPercentage: [null, [Validators.min(0), Validators.max(100)]],
      customInstallments: [null, [Validators.min(1)]],
      notes: ['', [Validators.maxLength(1000)]]
    });
  }

  ngOnInit(): void {
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
        const defaultStatusId = this.propertyStatuses.find(status => status.name?.toLowerCase() === 'disponible')?.id || this.propertyStatuses[0]?.id || null;

        this.unitForm.patchValue({ propertyStatusId: defaultStatusId });
        this.propertyForm.patchValue({ propertyStatusId: defaultStatusId });
      },
      error: (error: any) => console.error('Error loading property statuses:', error)
    });
  }

  private loadExistingHierarchy(): void {
    this.phaseService.getAll().subscribe({
      next: (response: any) => {
        this.phases = response.data || [];
        this.phaseMode = this.phases.length ? 'existing' : 'create';
      },
      error: (error: any) => console.error('Error loading existing phases:', error)
    });
  }

  private loadBlocksByPhase(phaseId: number): void {
    this.blockService.getByPhase(phaseId).subscribe({
      next: (response: any) => {
        this.blocks = response.data || [];
        this.blockMode = this.blocks.length ? 'existing' : 'create';
      },
      error: (error: any) => {
        console.error('Error loading blocks by phase:', error);
        this.blocks = [];
        this.blockMode = 'create';
      }
    });
  }

  private loadUnitsByBlock(blockId: number): void {
    this.unitService.getByBlock(blockId).subscribe({
      next: (response: any) => {
        this.units = response.data || [];
        this.unitMode = this.units.length ? 'existing' : 'create';
      },
      error: (error: any) => {
        console.error('Error loading units by block:', error);
        this.units = [];
        this.unitMode = 'create';
      }
    });
  }

  submitPhase(): void {
    if (this.phaseMode === 'existing') {
      if (!this.selectedPhaseId || this.loading) {
        return;
      }

      this.createdPhaseId = this.selectedPhaseId;
      this.loadBlocksByPhase(this.createdPhaseId);
      this.currentStep = 2;
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
        this.loadBlocksByPhase(phaseId);
        this.currentStep = 2;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error creating phase:', error);
        this.loading = false;
      }
    });
  }

  submitBlock(): void {
    if (this.blockMode === 'existing') {
      if (!this.selectedBlockId || this.loading) {
        return;
      }

      this.createdBlockId = this.selectedBlockId;
      this.loadUnitsByBlock(this.createdBlockId);
      this.currentStep = 3;
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
        this.loadUnitsByBlock(blockId);
        this.currentStep = 3;
        this.loading = false;
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
    if (this.unitMode === 'existing') {
      if (!this.selectedUnitId || this.loading) {
        return;
      }

      this.createdUnitId = this.selectedUnitId;
      this.currentStep = 5;
      return;
    }

    if (this.unitForm.invalid || this.loading || !this.createdBlockId) {
      this.unitForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = {
      ...this.unitForm.value,
      blockId: this.createdBlockId
    };

    this.unitService.create(payload).subscribe({
      next: (response: any) => {
        this.createdUnitId = response.data.id;
        this.selectedUnitId = this.createdUnitId;
        this.units = [response.data, ...this.units];
        this.currentStep = 5;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error creating unit:', error);
        this.loading = false;
      }
    });
  }

  submitProperty(): void {
    if (this.propertyForm.invalid || this.loading || !this.createdPropertyModelId || !this.createdUnitId) {
      this.propertyForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const values = this.propertyForm.value;

    const payload: CreatePropertyData = {
      propertyModelId: this.createdPropertyModelId,
      unitId: this.createdUnitId,
      propertyStatusId: values.propertyStatusId || undefined,
      landAreaSqm: this.toNullableNumber(values.landAreaSqm),
      customPrice: this.toNullableNumber(values.customPrice),
      customDownPaymentPercentage: this.toNullableNumber(values.customDownPaymentPercentage),
      customInstallments: this.toNullableInteger(values.customInstallments),
      notes: values.notes?.trim() || undefined
    };

    this.propertyService.createProperty(payload).subscribe({
      next: (response: any) => {
        this.createdPropertyId = response.data.id;
        this.completed = true;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error creating property:', error);
        this.loading = false;
      }
    });
  }

  goToStep(step: number): void {
    if (this.loading || step < 1 || step > 5) {
      return;
    }

    if (step === 1) {
      this.currentStep = 1;
      return;
    }

    if (step === 2 && this.createdPhaseId) {
      this.loadBlocksByPhase(this.createdPhaseId);
      this.currentStep = 2;
      return;
    }

    if (step === 3 && this.createdBlockId) {
      this.currentStep = 3;
      return;
    }

    if (step === 4 && this.createdPropertyModelId) {
      if (this.createdBlockId) {
        this.loadUnitsByBlock(this.createdBlockId);
      }
      this.currentStep = 4;
      return;
    }

    if (step === 5 && this.createdUnitId) {
      this.currentStep = 5;
    }
  }

  resetWizard(): void {
    this.currentStep = 1;
    this.completed = false;
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

    this.phaseForm.reset({ isActive: true });
    this.blockForm.reset();
    this.propertyModelForm.reset({ areaSqm: 0, bedrooms: 1, bathrooms: 1, isActive: true });
    this.unitForm.reset({ isAvailable: true });
    this.propertyForm.reset();

    const defaultStatusId = this.propertyStatuses.find(status => status.name?.toLowerCase() === 'disponible')?.id || this.propertyStatuses[0]?.id || null;
    this.unitForm.patchValue({ propertyStatusId: defaultStatusId });
    this.propertyForm.patchValue({ propertyStatusId: defaultStatusId });

    this.phaseMode = this.phases.length ? 'existing' : 'create';
    this.blockMode = 'existing';
    this.propertyModelMode = this.propertyModels.length ? 'existing' : 'create';
    this.unitMode = 'existing';
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
}
