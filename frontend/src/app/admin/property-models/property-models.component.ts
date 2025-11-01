import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { PropertyModelService, PropertyModel } from '../../services/property-model.service';
import { PropertyTypeService, PropertyType } from '../../services/property-type.service';
import { PhaseService, Phase } from '../../services/phase.service';

@Component({
  selector: 'app-property-models',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule
  ],
  templateUrl: './property-models.component.html',
  styleUrl: './property-models.component.scss'
})
export class PropertyModelsComponent implements OnInit {
  propertyModels: PropertyModel[] = [];
  propertyTypes: PropertyType[] = [];
  phases: Phase[] = [];
  loading = false;
  showCreateDialog = false;
  showEditDialog = false;
  selectedPropertyModel: PropertyModel | null = null;

  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private readonly propertyModelService: PropertyModelService,
    private readonly propertyTypeService: PropertyTypeService,
    private readonly phaseService: PhaseService,
    private readonly fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      propertyTypeId: [null, [Validators.required]],
      phaseId: [null, [Validators.required]],
      basePrice: [0, [Validators.required, Validators.min(0)]],
      areaSqm: [0, [Validators.min(0)]],
      bedrooms: [1, [Validators.min(1)]],
      bathrooms: [1, [Validators.min(1)]],
      parkingSpaces: [0, [Validators.min(0)]],
      downPaymentPercentage: [0, [Validators.min(0), Validators.max(100)]],
      totalInstallments: [0, [Validators.min(0)]],
      floorPlanUrl: [''],
      isActive: [true]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      propertyTypeId: [null, [Validators.required]],
      phaseId: [null, [Validators.required]],
      basePrice: [0, [Validators.required, Validators.min(0)]],
      areaSqm: [0, [Validators.min(0)]],
      bedrooms: [1, [Validators.min(1)]],
      bathrooms: [1, [Validators.min(1)]],
      parkingSpaces: [0, [Validators.min(0)]],
      downPaymentPercentage: [0, [Validators.min(0), Validators.max(100)]],
      totalInstallments: [0, [Validators.min(0)]],
      floorPlanUrl: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadPropertyModels();
    this.loadPropertyTypes();
    this.loadPhases();
  }

  loadPropertyModels(): void {
    this.loading = true;
    this.propertyModelService.getAll().subscribe({
      next: (response: any) => {
        this.propertyModels = response.data;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading property models:', error);
        this.loading = false;
      }
    });
  }

  loadPropertyTypes(): void {
    this.propertyTypeService.getAllPropertyTypes().subscribe({
      next: (response: any) => {
        this.propertyTypes = response.data;
      },
      error: (error: any) => {
        console.error('Error loading property types:', error);
      }
    });
  }

  loadPhases(): void {
    this.phaseService.getAllPhases().subscribe({
      next: (response: any) => {
        this.phases = response.data;
      },
      error: (error: any) => {
        console.error('Error loading phases:', error);
      }
    });
  }

  toggleCreateForm(): void {
    this.showCreateDialog = !this.showCreateDialog;
    if (this.showCreateDialog) {
      this.createForm.reset({
        name: '',
        description: '',
        propertyTypeId: null,
        phaseId: null,
        basePrice: 0,
        areaSqm: 0,
        bedrooms: 1,
        bathrooms: 1,
        parkingSpaces: 0,
        downPaymentPercentage: 0,
        totalInstallments: 0,
        floorPlanUrl: '',
        isActive: true
      });
    }
  }

  cancelCreate(): void {
    this.showCreateDialog = false;
    this.createForm.reset();
  }

  onSubmitCreate(): void {
    if (this.createForm.valid) {
      this.loading = true;
      const formData = this.createForm.value;

      this.propertyModelService.create(formData).subscribe({
        next: (response: any) => {
          this.propertyModels.push(response.data);
          this.showCreateDialog = false;
          this.createForm.reset();
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error creating property model:', error);
          this.loading = false;
        }
      });
    }
  }

  onEdit(propertyModel: PropertyModel): void {
    this.selectedPropertyModel = propertyModel;
    this.editForm.patchValue({
      name: propertyModel.name,
      description: propertyModel.description || '',
      propertyTypeId: propertyModel.propertyTypeId,
      phaseId: propertyModel.phaseId,
      basePrice: propertyModel.base_price || 0,
      areaSqm: propertyModel.area_sqm || 0,
      bedrooms: propertyModel.bedrooms || 1,
      bathrooms: propertyModel.bathrooms || 1,
      parkingSpaces: propertyModel.parking_spaces || 0,
      downPaymentPercentage: propertyModel.down_payment_percentage || 0,
      totalInstallments: propertyModel.total_installments || 0,
      floorPlanUrl: propertyModel.floorPlanUrl || '',
      isActive: propertyModel.is_active
    });
    this.showEditDialog = true;
  }

  cancelEdit(): void {
    this.showEditDialog = false;
    this.selectedPropertyModel = null;
    this.editForm.reset();
  }

  onSubmitEdit(): void {
    if (this.editForm.valid && this.selectedPropertyModel) {
      this.loading = true;
      const formData = this.editForm.value;

      this.propertyModelService.update(this.selectedPropertyModel.id, formData).subscribe({
        next: (response: any) => {
          const index = this.propertyModels.findIndex(pm => pm.id === this.selectedPropertyModel!.id);
          if (index !== -1) {
            this.propertyModels[index] = response.data;
          }
          this.showEditDialog = false;
          this.selectedPropertyModel = null;
          this.editForm.reset();
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error updating property model:', error);
          this.loading = false;
        }
      });
    }
  }

  onDelete(propertyModel: PropertyModel): void {
    if (confirm(`¿Estás seguro de que quieres eliminar el modelo "${propertyModel.name}"?`)) {
      this.loading = true;
      this.propertyModelService.delete(propertyModel.id).subscribe({
        next: () => {
          this.propertyModels = this.propertyModels.filter(pm => pm.id !== propertyModel.id);
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error deleting property model:', error);
          this.loading = false;
        }
      });
    }
  }

  // Utility methods for stats
  getActiveCount(): number {
    return this.propertyModels.filter(pm => pm.is_active).length;
  }

  getInactiveCount(): number {
    return this.propertyModels.filter(pm => !pm.is_active).length;
  }

  getAveragePrice(): number {
    if (this.propertyModels.length === 0) return 0;
    const total = this.propertyModels.reduce((sum, pm) => sum + (pm.base_price || 0), 0);
    return Math.round(total / this.propertyModels.length);
  }

  getTotalProperties(): number {
    return this.propertyModels.length;
  }

  // Helper methods
  getPropertyTypeName(propertyTypeId: number): string {
    const propertyType = this.propertyTypes.find(pt => pt.id === propertyTypeId);
    return propertyType ? propertyType.name : 'No definido';
  }

  getPhaseName(phaseId: number): string {
    const phase = this.phases.find(p => p.id === phaseId);
    return phase ? phase.name : 'No definido';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatSize(areaSqm: number): string {
    return areaSqm ? `${areaSqm} m²` : 'No especificado';
  }

  // Track by function for ngFor
  trackByPropertyModel(index: number, propertyModel: PropertyModel): number {
    return propertyModel.id;
  }
}