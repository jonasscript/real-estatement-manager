import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { PropertyService, Property, RealEstateService, RealEstate } from '../../services/real-estate.service';
import { PermissionService } from '../../services/permission.service';

import { Property as PropertyInterface, RealEstate as RealEstateInterface } from '../../services/real-estate.service';

@Component({
  selector: 'app-properties',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './properties.component.html',
  styleUrls: ['./properties.component.scss']
})
export class PropertiesComponent implements OnInit {
  properties: PropertyInterface[] = [];
  realEstates: RealEstateInterface[] = [];
  loading = false;
  showCreateForm = false;
  editingProperty: PropertyInterface | null = null;
  selectedRealEstateId: number | null = null;

  // Permission flags
  canCreateProperties = false;
  canEditProperties = false;
  canDeleteProperties = false;
  canViewProperties = false;

  createForm: FormGroup;
  editForm: FormGroup;


  constructor(
    private propertyService: PropertyService,
    private realEstateService: RealEstateService,
    private permissionService: PermissionService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.createForm = this.fb.group({
      realEstateId: ['', [Validators.required]],
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      propertyType: ['house', [Validators.required]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      price: ['', [Validators.required, Validators.min(0)]],
      downPaymentPercentage: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
      totalInstallments: [24, [Validators.required, Validators.min(1)]],
      status: ['available']
    });

    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required]],
      propertyType: ['', [Validators.required]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      price: ['', [Validators.required, Validators.min(0)]],
      downPaymentPercentage: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      totalInstallments: ['', [Validators.required, Validators.min(1)]],
      status: ['']
    });
  }

  ngOnInit(): void {
    this.loadPermissions();
    this.route.queryParams.subscribe(params => {
      this.selectedRealEstateId = params['realEstateId'] ? parseInt(params['realEstateId']) : null;
      this.loadProperties();
    });
    this.loadRealEstates();
  }

  loadProperties(): void {
    this.loading = true;
    const filters = this.selectedRealEstateId ? { realEstateId: this.selectedRealEstateId } : {};

    this.propertyService.getAllProperties(filters)
      .subscribe({
        next: (response) => {
          this.properties = response.data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading properties:', error);
          this.loading = false;
        }
      });
  }

  loadPermissions(): void {
    // Load all permissions for current user at once
    this.permissionService.loadUserPermissions().subscribe({
      next: (permissions) => {
        // Set permission flags based on loaded permissions
        this.canCreateProperties = permissions.some(p => p.component_name === 'properties' && p.action === 'create');
        this.canEditProperties = permissions.some(p => p.component_name === 'properties' && p.action === 'edit');
        this.canDeleteProperties = permissions.some(p => p.component_name === 'properties' && p.action === 'delete');
        this.canViewProperties = permissions.some(p => p.component_name === 'properties' && p.action === 'view');
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
        // Default to no permissions on error
        this.canCreateProperties = false;
        this.canEditProperties = false;
        this.canDeleteProperties = false;
        this.canViewProperties = false;
      }
    });
  }

  loadRealEstates(): void {
    this.realEstateService.getAllRealEstates()
      .subscribe({
        next: (response) => {
          this.realEstates = response.data;
        },
        error: (error) => {
          console.error('Error loading real estates:', error);
        }
      });
  }

  onCreate(): void {
    if (this.createForm.valid) {
      this.loading = true;
      const formData = this.createForm.value;

      // Calculate installment amount
      const downPaymentAmount = (formData.price * formData.downPaymentPercentage) / 100;
      const installmentAmount = downPaymentAmount / formData.totalInstallments;

      const propertyData = {
        ...formData,
        installmentAmount,
        realEstateId: parseInt(formData.realEstateId)
      };

      this.propertyService.createProperty(propertyData)
        .subscribe({
          next: (response) => {
            this.properties.unshift(response.data);
            this.createForm.reset({ propertyType: 'house', downPaymentPercentage: 10, totalInstallments: 24, status: 'available' });
            this.showCreateForm = false;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error creating property:', error);
            this.loading = false;
          }
        });
    }
  }

  onEdit(property: Property): void {
    this.editingProperty = property;
    this.editForm.patchValue({
      title: property.title,
      description: property.description,
      propertyType: property.property_type,
      address: property.address,
      city: property.city,
      price: property.price,
      downPaymentPercentage: property.down_payment_percentage,
      totalInstallments: property.total_installments,
      status: property.status
    });
  }

  onUpdate(): void {
    if (this.editForm.valid && this.editingProperty) {
      this.loading = true;
      const formData = this.editForm.value;

      // Recalculate installment amount if price or down payment changed
      const downPaymentAmount = (formData.price * formData.downPaymentPercentage) / 100;
      const installmentAmount = downPaymentAmount / formData.totalInstallments;

      const updateData = {
        ...formData,
        installmentAmount
      };

      this.propertyService.updateProperty(this.editingProperty!.id, updateData)
        .subscribe({
          next: (response) => {
            const index = this.properties.findIndex(p => p.id === this.editingProperty!.id);
            if (index !== -1) {
              this.properties[index] = response.data;
            }
            this.editingProperty = null;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error updating property:', error);
            this.loading = false;
          }
        });
    }
  }

  onDelete(property: Property): void {
    if (confirm(`Are you sure you want to delete "${property.title}"?`)) {
      this.loading = true;
      this.propertyService.deleteProperty(property.id)
        .subscribe({
          next: () => {
            this.properties = this.properties.filter(p => p.id !== property.id);
            this.loading = false;
          },
          error: (error) => {
            console.error('Error deleting property:', error);
            this.loading = false;
          }
        });
    }
  }

  cancelEdit(): void {
    this.editingProperty = null;
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.createForm.reset({ propertyType: 'house', downPaymentPercentage: 10, totalInstallments: 24, status: 'available' });
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'available': return 'status-available';
      case 'sold': return 'status-sold';
      case 'under_construction': return 'status-construction';
      default: return 'status-default';
    }
  }

  getPropertyTypeLabel(type: string): string {
    const types: { [key: string]: string } = {
      'house': 'House',
      'apartment': 'Apartment',
      'land': 'Land',
      'commercial': 'Commercial'
    };
    return types[type] || type;
  }
}
