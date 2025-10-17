import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SellerService, Seller, CreateSellerData } from '../../services/seller.service';
import { ClientService } from '../../services/client.service';
import { User } from '../../services/auth.service';

@Component({
  selector: 'app-sellers',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './sellers.component.html',
  styleUrls: ['./sellers.component.scss']
})

export class SellersComponent implements OnInit {
  sellers: Seller[] = [];
  availableUsers: any[] = [];
  loading = false;
  selectedRealEstateId: number | null = null;
  showAddSellerModal = false;
  sellerForm: FormGroup;
  sellerSubmitting = false;

  constructor(
    private sellerService: SellerService,
    private clientService: ClientService,
    private fb: FormBuilder
  ) {
    this.sellerForm = this.fb.group({
      userId: ['', [Validators.required]],
      commissionRate: [5.00, [Validators.required, Validators.min(0), Validators.max(100)]]
    });
  }

  ngOnInit(): void {
    this.loadUserRealEstate();
    this.loadSellers();
    this.loadAvailableUsers();
  }

  private loadUserRealEstate(): void {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.selectedRealEstateId = user.realEstateId;
    }
  }

  loadSellers(): void {
    this.loading = true;
    if (this.selectedRealEstateId) {
      this.sellerService.getSellersByRealEstate(this.selectedRealEstateId)
        .subscribe({
          next: (response) => {
            this.sellers = response.data;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading sellers:', error);
            this.loading = false;
          }
        });
    } else {
      this.loading = false;
    }
  }

  loadAvailableUsers(): void {
    if (this.selectedRealEstateId) {
      // Get users with role_id = 3 (seller role) for this real estate
      this.sellerService.getUsersSellersRealEstate(this.selectedRealEstateId)
        .subscribe({
          next: (response) => {
            this.availableUsers = response.data;
          },
          error: (error) => {
            console.error('Error loading available users:', error);
            this.availableUsers = [];
          }
        });
    }
  }

  // Add Seller Modal Methods
  openAddSellerModal(): void {
    this.showAddSellerModal = true;
    this.sellerForm.reset({ commissionRate: 5.00 });
  }

  closeAddSellerModal(): void {
    this.showAddSellerModal = false;
    this.sellerForm.reset();
  }

  onSubmitSeller(): void {
    if (this.sellerForm.valid && this.selectedRealEstateId) {
      this.sellerSubmitting = true;
      const formData = this.sellerForm.value;

      const sellerData: CreateSellerData = {
        userId: parseInt(formData.userId),
        realEstateId: this.selectedRealEstateId,
        commissionRate: parseFloat(formData.commissionRate)
      };

      this.sellerService.createSeller(sellerData)
        .subscribe({
          next: (response) => {
            this.sellerSubmitting = false;
            this.closeAddSellerModal();
            this.loadSellers(); // Refresh the sellers list
            this.loadAvailableUsers(); // Refresh available users
          },
          error: (error) => {
            console.error('Error creating seller:', error);
            this.sellerSubmitting = false;
          }
        });
    } else {
      this.markFormGroupTouched(this.sellerForm);
    }
  }

  getSellerFormError(fieldName: string): string {
    const control = this.sellerForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors['min']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `${this.getFieldLabel(fieldName)} must not exceed ${control.errors['max'].max}`;
      }
    }
    return '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      userId: 'User',
      commissionRate: 'Commission Rate'
    };
    return labels[fieldName] || fieldName;
  }

  getSellerStatus(seller: Seller): string {
    return seller.is_active ? 'Active' : 'Inactive';
  }

  getStatusClass(seller: Seller): string {
    return seller.is_active ? 'status-active' : 'status-inactive';
  }

  toggleSellerStatus(seller: Seller): void {
    const updateData = { is_active: !seller.is_active };
    this.sellerService.updateSeller(seller.id, updateData)
      .subscribe({
        next: () => {
          seller.is_active = !seller.is_active;
        },
        error: (error) => {
          console.error('Error updating seller status:', error);
        }
      });
  }
}