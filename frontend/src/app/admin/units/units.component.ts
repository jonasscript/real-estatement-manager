import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { UnitService, Unit } from '../../services/unit.service';
import { BlockService, Block } from '../../services/block.service';
import { PropertyModelService, PropertyModel } from '../../services/property-model.service';
import { PropertyStatusService, PropertyStatus } from '../../services/property-status.service';

@Component({
  selector: 'app-units',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule
  ],
  templateUrl: './units.component.html',
  styleUrl: './units.component.scss'
})
export class UnitsComponent implements OnInit {
  units: Unit[] = [];
  blocks: Block[] = [];
  propertyModels: PropertyModel[] = [];
  propertyStatuses: PropertyStatus[] = [];
  loading = false;
  showCreateDialog = false;
  showEditDialog = false;
  selectedUnit: Unit | null = null;

  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private readonly unitService: UnitService,
    private readonly blockService: BlockService,
    private readonly propertyModelService: PropertyModelService,
    private readonly propertyStatusService: PropertyStatusService,
    private readonly fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      unitNumber: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(20)]],
      blockId: [null, [Validators.required]],
      propertyModelId: [null, [Validators.required]],
      propertyStatusId: [null, [Validators.required]],
      description: ['', [Validators.maxLength(500)]],
      isAvailable: [true]
    });

    this.editForm = this.fb.group({
      unitNumber: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(20)]],
      blockId: [null, [Validators.required]],
      propertyModelId: [null, [Validators.required]],
      propertyStatusId: [null, [Validators.required]],
      description: ['', [Validators.maxLength(500)]],
      isAvailable: [true]
    });
  }

  ngOnInit(): void {
    this.loadUnits();
    this.loadBlocks();
    this.loadPropertyModels();
    this.loadPropertyStatuses();
  }

  loadUnits(): void {
    this.loading = true;
    this.unitService.getAll().subscribe({
      next: (response: any) => {
        this.units = response.data;
        console.log('Loaded units:', this.units);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading units:', error);
        this.loading = false;
      }
    });
  }

  loadBlocks(): void {
    this.blockService.getAll().subscribe({
      next: (response: any) => {
        this.blocks = response.data;
      },
      error: (error: any) => {
        console.error('Error loading blocks:', error);
      }
    });
  }

  loadPropertyModels(): void {
    this.propertyModelService.getAll().subscribe({
      next: (response: any) => {
        this.propertyModels = response.data;
      },
      error: (error: any) => {
        console.error('Error loading property models:', error);
      }
    });
  }

  loadPropertyStatuses(): void {
    this.propertyStatusService.getAllPropertyStatuses().subscribe({
      next: (response: any) => {
        this.propertyStatuses = response.data;
      },
      error: (error: any) => {
        console.error('Error loading property statuses:', error);
      }
    });
  }

  toggleCreateForm(): void {
    this.showCreateDialog = !this.showCreateDialog;
    if (this.showCreateDialog) {
      this.createForm.reset({
        unitNumber: '',
        blockId: null,
        propertyModelId: null,
        propertyStatusId: null,
        description: '',
        isAvailable: true
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

      this.unitService.create(formData).subscribe({
        next: (response: any) => {
          this.units.push(response.data);
          this.showCreateDialog = false;
          this.createForm.reset();
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error creating unit:', error);
          this.loading = false;
        }
      });
    }
  }

  onEdit(unit: Unit): void {
    this.selectedUnit = unit;
    this.editForm.patchValue({
      unitNumber: unit.unit_number,
      blockId: unit.block_id,
      propertyModelId: unit.property_model_id,
      propertyStatusId: unit.property_status_id,
      description: unit.description || '',
      isAvailable: unit.is_available
    });
    this.showEditDialog = true;
  }

  cancelEdit(): void {
    this.showEditDialog = false;
    this.selectedUnit = null;
    this.editForm.reset();
  }

  onSubmitEdit(): void {
    if (this.editForm.valid && this.selectedUnit) {
      this.loading = true;
      const formData = this.editForm.value;

      this.unitService.update(this.selectedUnit.id, formData).subscribe({
        next: (response: any) => {
          const index = this.units.findIndex(u => u.id === this.selectedUnit!.id);
          if (index !== -1) {
            this.units[index] = response.data;
          }
          this.showEditDialog = false;
          this.selectedUnit = null;
          this.editForm.reset();
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error updating unit:', error);
          this.loading = false;
        }
      });
    }
  }

  onDelete(unit: Unit): void {
    if (confirm(`¿Estás seguro de que quieres eliminar la unidad "${unit.unit_number}"?`)) {
      this.loading = true;
      this.unitService.delete(unit.id).subscribe({
        next: () => {
          this.units = this.units.filter(u => u.id !== unit.id);
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error deleting unit:', error);
          this.loading = false;
        }
      });
    }
  }

  // Utility methods for stats
  getAvailableCount(): number {
    return this.units.filter(u => u.is_available).length;
  }

  getNotAvailableCount(): number {
    return this.units.filter(u => !u.is_available).length;
  }

  getAveragePrice(): number {
    if (this.units.length === 0) return 0;
    const total = this.units.reduce((sum, u) => sum + (u.price || 0), 0);
    return Math.round(total / this.units.length);
  }

  getTotalArea(): number {
    return this.units.reduce((sum, u) => sum + (u.area || 0), 0);
  }

  // Helper methods
  getBlockName(blockId: number): string {
    const block = this.blocks.find(b => b.id === blockId);
    return block ? block.name : 'No definido';
  }

  getPropertyModelName(propertyModelId: number): string {
    const propertyModel = this.propertyModels.find(pm => pm.id === propertyModelId);
    return propertyModel ? propertyModel.name : 'No definido';
  }

  getPropertyStatusName(propertyStatusId: number): string {
    const propertyStatus = this.propertyStatuses.find(ps => ps.id === propertyStatusId);
    return propertyStatus ? propertyStatus.name : 'No definido';
  }

  getPropertyStatusColor(propertyStatusId: number): string {
    const propertyStatus = this.propertyStatuses.find(ps => ps.id === propertyStatusId);
    return propertyStatus?.color || '#6b7280';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatArea(area: number): string {
    return area ? `${area} m²` : 'No especificado';
  }

  // Track by function for ngFor
  trackByUnit(index: number, unit: Unit): number {
    return unit.id;
  }
}