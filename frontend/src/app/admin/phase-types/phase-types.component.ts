import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { PhaseTypeService } from '../../services/phase-type.service';
import { PhaseType } from '../../services/phase-type.service';

@Component({
  selector: 'app-phase-types',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule
  ],
  templateUrl: './phase-types.component.html',
  styleUrl: './phase-types.component.scss'
})
export class PhaseTypesComponent implements OnInit {
  phaseTypes: PhaseType[] = [];
  loading = false;
  showCreateDialog = false;
  showEditDialog = false;
  selectedPhaseType: PhaseType | null = null;

  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private phaseTypeService: PhaseTypeService,
    private fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadPhaseTypes();
  }

  loadPhaseTypes(): void {
    this.loading = true;
    this.phaseTypeService.getAll().subscribe({
      next: (response) => {
        this.phaseTypes = response.data;
        console.log('Loaded phase types:', this.phaseTypes);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading phase types:', error);
        this.loading = false;
      }
    });
  }

  toggleCreateForm(): void {
    this.showCreateDialog = !this.showCreateDialog;
    if (this.showCreateDialog) {
      this.createForm.reset({
        name: '',
        description: '',
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

      this.phaseTypeService.create(formData).subscribe({
        next: (response) => {
          this.phaseTypes.push(response.data);
          this.showCreateDialog = false;
          this.createForm.reset();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error creating phase type:', error);
          this.loading = false;
        }
      });
    }
  }

  onEdit(phaseType: PhaseType): void {
    this.selectedPhaseType = phaseType;
    this.editForm.patchValue({
      name: phaseType.name,
      description: phaseType.description || '',
      isActive: phaseType.is_active
    });
    this.showEditDialog = true;
  }

  cancelEdit(): void {
    this.showEditDialog = false;
    this.selectedPhaseType = null;
    this.editForm.reset();
  }

  onSubmitEdit(): void {
    if (this.editForm.valid && this.selectedPhaseType) {
      this.loading = true;
      const formData = this.editForm.value;

      this.phaseTypeService.update(this.selectedPhaseType.id, formData).subscribe({
        next: (response) => {
          const index = this.phaseTypes.findIndex(pt => pt.id === this.selectedPhaseType!.id);
          if (index !== -1) {
            this.phaseTypes[index] = response.data;
          }
          this.showEditDialog = false;
          this.selectedPhaseType = null;
          this.editForm.reset();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error updating phase type:', error);
          this.loading = false;
        }
      });
    }
  }

  onDelete(phaseType: PhaseType): void {
    if (confirm(`¿Estás seguro de que quieres eliminar el tipo de fase "${phaseType.name}"?`)) {
      this.loading = true;
      this.phaseTypeService.delete(phaseType.id).subscribe({
        next: () => {
          this.phaseTypes = this.phaseTypes.filter(pt => pt.id !== phaseType.id);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error deleting phase type:', error);
          this.loading = false;
        }
      });
    }
  }

  // Utility methods for stats
  getActiveCount(): number {
    return this.phaseTypes.filter(pt => pt.is_active).length;
  }

  getInactiveCount(): number {
    return this.phaseTypes.filter(pt => !pt.is_active).length;
  }

  // Track by function for ngFor
  trackByPhaseType(index: number, phaseType: PhaseType): number {
    return phaseType.id;
  }
}