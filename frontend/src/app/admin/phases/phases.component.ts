import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { PhaseService } from '../../services/phase.service';
import { Phase } from '../../services/phase.service';
import { PhaseTypeService, PhaseType } from '../../services/phase-type.service';
import { RealEstateService, RealEstate } from '../../services/real-estate.service';

@Component({
  selector: 'app-phases',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule
  ],
  templateUrl: './phases.component.html',
  styleUrl: './phases.component.scss'
})
export class PhasesComponent implements OnInit {
  phases: Phase[] = [];
  phaseTypes: PhaseType[] = [];
  realEstates: RealEstate[] = [];
  loading = false;
  showCreateDialog = false;
  showEditDialog = false;
  selectedPhase: Phase | null = null;

  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private phaseService: PhaseService,
    private phaseTypeService: PhaseTypeService,
    private realEstateService: RealEstateService,
    private fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      phaseTypeId: [null, [Validators.required]],
      startDate: [''],
      endDate: [''],
      isActive: [true]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      phaseTypeId: [null, [Validators.required]],
      realEstateId: [null, [Validators.required]],
      startDate: [''],
      endDate: [''],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadPhases();
    this.loadPhaseTypes();
    this.loadRealEstates();
  }

  loadPhases(): void {
    this.loading = true;
    this.phaseService.getAll().subscribe({
      next: (response: any) => {
        this.phases = response.data;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading phases:', error);
        this.loading = false;
      }
    });
  }

  loadPhaseTypes(): void {
    this.phaseTypeService.getAll().subscribe({
      next: (response: any) => {
        this.phaseTypes = response.data.filter((pt: PhaseType) => pt.is_active);
        console.log('Loaded phase types:', this.phaseTypes);
      },
      error: (error: any) => {
        console.error('Error loading phase types:', error);
      }
    });
  }

  loadRealEstates(): void {
    console.log('Loading real estates...');
    this.realEstateService.getAll().subscribe({
      next: (response) => {
        console.log('Real estates response:', response);
        this.realEstates = response.data || [];
        console.log('Real estates data assigned:', this.realEstates);
      },
      error: (error) => {
        console.error('Error loading real estates:', error);
        this.realEstates = [];
      }
    });
  }

  trackByRealEstate(index: number, item: any): any {
    return item.id;
  }

  toggleCreateForm(): void {
    this.showCreateDialog = !this.showCreateDialog;
    if (this.showCreateDialog) {
      this.createForm.reset({
        name: '',
        description: '',
        phaseTypeId: null,
        startDate: '',
        endDate: '',
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

      // Convert date strings to proper format
      if (formData.startDate) {
        formData.startDate = new Date(formData.startDate).toISOString().split('T')[0];
      }
      if (formData.endDate) {
        formData.endDate = new Date(formData.endDate).toISOString().split('T')[0];
      }

      // Usar la nueva API que obtiene el realEstateId del JWT
      this.phaseService.createPhaseForSelfRealEstate(formData).subscribe({
        next: (response: any) => {
          this.phases.push(response.data);
          this.showCreateDialog = false;
          this.createForm.reset();
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error creating phase:', error);
          this.loading = false;
        }
      });
    }
  }

  onEdit(phase: Phase): void {
    this.selectedPhase = phase;
    this.editForm.patchValue({
      name: phase.name,
      description: phase.description || '',
      phaseTypeId: phase.phaseTypeId,
      realEstateId: phase.realEstateId,
      startDate: phase.startDate ? new Date(phase.startDate).toISOString().split('T')[0] : '',
      endDate: phase.endDate ? new Date(phase.endDate).toISOString().split('T')[0] : '',
      isActive: phase.is_active
    });
    this.showEditDialog = true;
  }

  cancelEdit(): void {
    this.showEditDialog = false;
    this.selectedPhase = null;
    this.editForm.reset();
  }

  onSubmitEdit(): void {
    if (this.editForm.valid && this.selectedPhase) {
      this.loading = true;
      const formData = this.editForm.value;

      // Convert date strings to proper format
      if (formData.startDate) {
        formData.startDate = new Date(formData.startDate).toISOString().split('T')[0];
      }
      if (formData.endDate) {
        formData.endDate = new Date(formData.endDate).toISOString().split('T')[0];
      }

      this.phaseService.update(this.selectedPhase.id, formData).subscribe({
        next: (response: any) => {
          const index = this.phases.findIndex(p => p.id === this.selectedPhase!.id);
          if (index !== -1) {
            this.phases[index] = response.data;
          }
          this.showEditDialog = false;
          this.selectedPhase = null;
          this.editForm.reset();
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error updating phase:', error);
          this.loading = false;
        }
      });
    }
  }

  onDelete(phase: Phase): void {
    if (confirm(`¿Estás seguro de que quieres eliminar la etapa "${phase.name}"?`)) {
      this.loading = true;
      this.phaseService.delete(phase.id).subscribe({
        next: () => {
          this.phases = this.phases.filter(p => p.id !== phase.id);
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error deleting phase:', error);
          this.loading = false;
        }
      });
    }
  }

  // Utility methods for stats
  getActiveCount(): number {
    return this.phases.filter(p => p.is_active).length;
  }

  getInactiveCount(): number {
    return this.phases.filter(p => !p.is_active).length;
  }

  getCompletedCount(): number {
    return this.phases.filter(p => p.endDate && new Date(p.endDate) < new Date()).length;
  }

  getInProgressCount(): number {
    return this.phases.filter(p => 
      p.startDate && new Date(p.startDate) <= new Date() && 
      (!p.endDate || new Date(p.endDate) >= new Date())
    ).length;
  }

  // Helper methods
  getPhaseTypeName(phaseTypeId: number): string {
    const phaseType = this.phaseTypes.find(pt => pt.id === phaseTypeId);
    return phaseType ? phaseType.name : 'No definido';
  }

  getRealEstateName(realEstateId: number): string {
    const realEstate = this.realEstates.find(re => re.id === realEstateId);
    return realEstate ? realEstate.name : 'No definido';
  }

  getPhaseStatus(phase: Phase): string {
    if (!phase.is_active) return 'inactive';
    if (!phase.startDate) return 'planned';
    
    const now = new Date();
    const startDate = new Date(phase.startDate);
    const endDate = phase.endDate ? new Date(phase.endDate) : null;
    
    if (startDate > now) return 'planned';
    if (endDate && endDate < now) return 'completed';
    return 'in-progress';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'planned': 'Planificada',
      'in-progress': 'En Progreso',
      'completed': 'Completada',
      'inactive': 'Inactiva'
    };
    return labels[status] || 'Desconocido';
  }

  // Track by function for ngFor
  trackByPhase(index: number, phase: Phase): number {
    return phase.id;
  }
}