import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PropertyTypeService, PropertyType } from '../../services/property-type.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-property-types',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './property-types.component.html',
  styleUrls: ['./property-types.component.scss']
})
export class PropertyTypesComponent implements OnInit {
  propertyTypes: PropertyType[] = [];
  loading = false;
  showCreateDialog = false;
  editingPropertyType: PropertyType | null = null;
  showEditDialog = false;

  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private readonly propertyTypeService: PropertyTypeService,
    private readonly fb: FormBuilder
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
    this.loadPropertyTypes();
  }

  loadPropertyTypes(): void {
    this.loading = true;
    this.propertyTypeService.getAllPropertyTypes()
      .subscribe({
        next: (response) => {
          if (response.success && Array.isArray(response.data)) {
            this.propertyTypes = response.data;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading property types:', error);
          this.loading = false;
        }
      });
  }

  onSubmitCreate(): void {
    if (this.createForm.valid) {
      this.loading = true;
      this.propertyTypeService.createPropertyType(this.createForm.value)
        .subscribe({
          next: (response) => {
            if (response.success && !Array.isArray(response.data)) {
              this.propertyTypes.push(response.data);
              this.showCreateDialog = false;
              this.createForm.reset({ isActive: true });
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error creating property type:', error);
            this.loading = false;
          }
        });
    }
  }

  onEdit(propertyType: PropertyType): void {
    this.editingPropertyType = propertyType;
    this.editForm.patchValue({
      name: propertyType.name,
      description: propertyType.description || '',
      isActive: propertyType.isActive
    });
    this.showEditDialog = true;
  }

  onSubmitEdit(): void {
    if (this.editForm.valid && this.editingPropertyType) {
      this.loading = true;
      this.propertyTypeService.updatePropertyType(this.editingPropertyType.id, this.editForm.value)
        .subscribe({
          next: (response) => {
            if (response.success && !Array.isArray(response.data)) {
              const index = this.propertyTypes.findIndex(pt => pt.id === this.editingPropertyType?.id);
              if (index !== -1) {
                this.propertyTypes[index] = response.data;
              }
              this.editingPropertyType = null;
              this.showEditDialog = false;
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error updating property type:', error);
            this.loading = false;
          }
        });
    }
  }

  onDelete(propertyType: PropertyType): void {
    if (confirm(`¿Estás seguro de que quieres eliminar "${propertyType.name}"?`)) {
      this.loading = true;
      this.propertyTypeService.deletePropertyType(propertyType.id)
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.propertyTypes = this.propertyTypes.filter(pt => pt.id !== propertyType.id);
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error deleting property type:', error);
            this.loading = false;
          }
        });
    }
  }

  cancelEdit(): void {
    this.editingPropertyType = null;
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
    return this.propertyTypes.filter(pt => pt.isActive).length;
  }

  getInactiveCount(): number {
    return this.propertyTypes.filter(pt => !pt.isActive).length;
  }

  trackByPropertyType(index: number, propertyType: PropertyType): number {
    return propertyType.id;
  }
}