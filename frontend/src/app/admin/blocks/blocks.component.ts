import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { BlockService, Block } from '../../services/block.service';
import { PhaseService, Phase } from '../../services/phase.service';
import { PhaseTypeService, PhaseType } from '../../services/phase-type.service';

@Component({
  selector: 'app-blocks',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule
  ],
  templateUrl: './blocks.component.html',
  styleUrl: './blocks.component.scss'
})
export class BlocksComponent implements OnInit {
  blocks: Block[] = [];
  phases: Phase[] = [];
  phaseTypes: PhaseType[] = [];
  loading = false;
  creatingPhase = false;
  showCreateDialog = false;
  showEditDialog = false;
  showCreatePhaseDialog = false;
  selectedBlock: Block | null = null;
  phaseTargetForm: 'create' | 'edit' = 'create';

  createForm: FormGroup;
  editForm: FormGroup;
  createPhaseForm: FormGroup;

  constructor(
    private readonly blockService: BlockService,
    private readonly phaseService: PhaseService,
    private readonly phaseTypeService: PhaseTypeService,
    private readonly fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      phaseId: [null, [Validators.required]]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      phaseId: [null, [Validators.required]]
    });

    this.createPhaseForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      phaseTypeId: [null, [Validators.required]],
      startDate: [''],
      endDate: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadBlocks();
    this.loadPhases();
    this.loadPhaseTypes();
  }

  loadBlocks(): void {
    this.loading = true;
    this.blockService.getAll().subscribe({
      next: (response: any) => {
        this.blocks = response.data;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading blocks:', error);
        this.loading = false;
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

  loadPhaseTypes(): void {
    this.phaseTypeService.getAll().subscribe({
      next: (response: any) => {
        this.phaseTypes = response.data.filter((phaseType: PhaseType) => phaseType.is_active);
      },
      error: (error: any) => {
        console.error('Error loading phase types:', error);
      }
    });
  }

  openCreatePhaseDialog(targetForm: 'create' | 'edit'): void {
    this.phaseTargetForm = targetForm;
    this.createPhaseForm.reset({
      name: '',
      description: '',
      phaseTypeId: null,
      startDate: '',
      endDate: '',
      isActive: true
    });
    this.showCreatePhaseDialog = true;
  }

  cancelCreatePhase(): void {
    this.showCreatePhaseDialog = false;
    this.createPhaseForm.reset();
    this.creatingPhase = false;
  }

  onSubmitCreatePhase(): void {
    if (this.createPhaseForm.invalid) {
      this.createPhaseForm.markAllAsTouched();
      return;
    }

    this.creatingPhase = true;
    const formData = { ...this.createPhaseForm.value };

    if (formData.startDate) {
      formData.startDate = new Date(formData.startDate).toISOString().split('T')[0];
    }
    if (formData.endDate) {
      formData.endDate = new Date(formData.endDate).toISOString().split('T')[0];
    }

    this.phaseService.createPhaseForSelfRealEstate(formData).subscribe({
      next: (response: any) => {
        const createdPhase: Phase = response.data;
        this.phases = [...this.phases, createdPhase];

        if (this.phaseTargetForm === 'create') {
          this.createForm.patchValue({ phaseId: createdPhase.id });
        } else {
          this.editForm.patchValue({ phaseId: createdPhase.id });
        }

        this.showCreatePhaseDialog = false;
        this.createPhaseForm.reset();
        this.creatingPhase = false;
      },
      error: (error: any) => {
        console.error('Error creating phase from blocks:', error);
        this.creatingPhase = false;
      }
    });
  }

  toggleCreateForm(): void {
    this.showCreateDialog = !this.showCreateDialog;
    if (this.showCreateDialog) {
      this.createForm.reset({
        name: '',
        description: '',
        phaseId: null
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

      this.blockService.create(formData).subscribe({
        next: (response: any) => {
          this.blocks.push(response.data);
          this.showCreateDialog = false;
          this.createForm.reset();
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error creating block:', error);
          this.loading = false;
        }
      });
    }
  }

  onEdit(block: Block): void {
    this.selectedBlock = block;
    this.editForm.patchValue({
      name: block.name,
      description: block.description || '',
      phaseId: block.phase_id
    });
    this.showEditDialog = true;
  }

  cancelEdit(): void {
    this.showEditDialog = false;
    this.selectedBlock = null;
    this.editForm.reset();
  }

  onSubmitEdit(): void {
    if (this.editForm.valid && this.selectedBlock) {
      this.loading = true;
      const formData = this.editForm.value;

      this.blockService.update(this.selectedBlock.id, formData).subscribe({
        next: (response: any) => {
          const index = this.blocks.findIndex(b => b.id === this.selectedBlock!.id);
          if (index !== -1) {
            this.blocks[index] = response.data;
          }
          this.showEditDialog = false;
          this.selectedBlock = null;
          this.editForm.reset();
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error updating block:', error);
          this.loading = false;
        }
      });
    }
  }

  onDelete(block: Block): void {
    if (confirm(`¿Estás seguro de que quieres eliminar el bloque "${block.name}"?`)) {
      this.loading = true;
      this.blockService.delete(block.id).subscribe({
        next: () => {
          this.blocks = this.blocks.filter(b => b.id !== block.id);
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error deleting block:', error);
          this.loading = false;
        }
      });
    }
  }

  // Utility methods for stats
  getActiveCount(): number {
    return this.blocks.length; // All blocks are considered active since there's no is_active field
  }

  getInactiveCount(): number {
    return 0; // No inactive blocks since there's no is_active field
  }

  getTotalUnits(): number {
    return this.blocks.reduce((sum, b) => sum + (b.total_units || 0), 0);
  }

  getAvailableUnits(): number {
    return this.blocks.reduce((sum, b) => sum + (b.available_units || 0), 0);
  }

  getOccupancyRate(): number {
    const total = this.getTotalUnits();
    const available = this.getAvailableUnits();
    if (total === 0) return 0;
    return Math.round(((total - available) / total) * 100);
  }

  // Helper methods
  getPhaseName(phaseId: number): string {
    const phase = this.phases.find(p => p.id === phaseId);
    return phase ? phase.name : 'No definido';
  }

  getOccupancyForBlock(block: Block): number {
    if (block.occupancy_rate !== undefined && block.occupancy_rate !== null) {
      return Math.round(block.occupancy_rate);
    }

    const total = block.total_units || 0;
    const available = block.available_units || 0;
    if (total === 0) return 0;
    return Math.round(((total - available) / total) * 100);
  }

  getOccupancyStatus(occupancyRate: number): string {
    if (occupancyRate >= 90) return 'high';
    if (occupancyRate >= 60) return 'medium';
    if (occupancyRate >= 30) return 'low';
    return 'empty';
  }

  getOccupancyLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'high': 'Alta Ocupación',
      'medium': 'Ocupación Media',
      'low': 'Ocupación Baja',
      'empty': 'Disponible'
    };
    return labels[status] || 'Desconocido';
  }

  // Track by function for ngFor
  trackByBlock(index: number, block: Block): number {
    return block.id;
  }
}