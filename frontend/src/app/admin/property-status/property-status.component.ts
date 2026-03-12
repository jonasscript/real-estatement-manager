import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PropertyStatusService, PropertyStatus } from '../../services/property-status.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-property-status',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './property-status.component.html',
  styleUrls: ['./property-status.component.scss']
})
export class PropertyStatusComponent implements OnInit {
  propertyStatuses: PropertyStatus[] = [];
  loading = false;
  showCreateDialog = false;
  editingPropertyStatus: PropertyStatus | null = null;
  showEditDialog = false;

  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private readonly propertyStatusService: PropertyStatusService,
    private readonly fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      color: ['', [Validators.maxLength(20)]],
      isActive: [true]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(500)]],
      color: ['', [Validators.maxLength(20)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadPropertyStatuses();
  }

  loadPropertyStatuses(): void {
    this.loading = true;
    this.propertyStatusService.getAllPropertyStatuses()
      .subscribe({
        next: (response) => {
          if (response.success && Array.isArray(response.data)) {
            this.propertyStatuses = response.data;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading property statuses:', error);
          this.loading = false;
        }
      });
  }

  onSubmitCreate(): void {
    if (this.createForm.valid) {
      this.loading = true;
      this.propertyStatusService.createPropertyStatus(this.createForm.value)
        .subscribe({
          next: (response) => {
            if (response.success && !Array.isArray(response.data)) {
              this.propertyStatuses.push(response.data);
              this.showCreateDialog = false;
              this.createForm.reset({ isActive: true });
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error creating property status:', error);
            this.loading = false;
          }
        });
    }
  }

  onEdit(propertyStatus: PropertyStatus): void {
    this.editingPropertyStatus = propertyStatus;
    this.editForm.patchValue({
      name: propertyStatus.name,
      description: propertyStatus.description || '',
      color: propertyStatus.color || '',
      isActive: propertyStatus.isActive
    });
    this.showEditDialog = true;
  }

  onSubmitEdit(): void {
    if (this.editForm.valid && this.editingPropertyStatus) {
      this.loading = true;
      this.propertyStatusService.updatePropertyStatus(this.editingPropertyStatus.id, this.editForm.value)
        .subscribe({
          next: (response) => {
            if (response.success && !Array.isArray(response.data)) {
              const index = this.propertyStatuses.findIndex(ps => ps.id === this.editingPropertyStatus?.id);
              if (index !== -1) {
                this.propertyStatuses[index] = response.data;
              }
              this.editingPropertyStatus = null;
              this.showEditDialog = false;
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error updating property status:', error);
            this.loading = false;
          }
        });
    }
  }

  onDelete(propertyStatus: PropertyStatus): void {
    if (confirm(`¿Estás seguro de que quieres eliminar "${propertyStatus.name}"?`)) {
      this.loading = true;
      this.propertyStatusService.deletePropertyStatus(propertyStatus.id)
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.propertyStatuses = this.propertyStatuses.filter(ps => ps.id !== propertyStatus.id);
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error deleting property status:', error);
            this.loading = false;
          }
        });
    }
  }

  cancelEdit(): void {
    this.editingPropertyStatus = null;
    this.showEditDialog = false;
    this.editForm.reset();
  }

  toggleCreateForm(): void {
    this.showCreateDialog = !this.showCreateDialog;
    if (!this.showCreateDialog) {
      this.createForm.reset({ isActive: true });
    }
  }

  cancelCreate(): void {
    this.showCreateDialog = false;
    this.createForm.reset({ isActive: true });
  }

  getActiveCount(): number {
    return this.propertyStatuses.filter(ps => ps.isActive).length;
  }

  getInactiveCount(): number {
    return this.propertyStatuses.filter(ps => !ps.isActive).length;
  }

  trackByPropertyStatus(index: number, propertyStatus: PropertyStatus): number {
    return propertyStatus.id;
  }

  getStatusColors(): string[] {
    return this.propertyStatuses
      .filter(ps => ps.color)
      .map(ps => ps.color!)
      .filter((color, index, array) => array.indexOf(color) === index);
  }
}