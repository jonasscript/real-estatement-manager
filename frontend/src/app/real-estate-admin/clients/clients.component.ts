import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientService, Client, Property } from '../../services/client.service';
import { SellerService, Seller } from '../../services/seller.service';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})

export class ClientsComponent implements OnInit {
  clients: Client[] = [];
  sellers: Seller[] = [];
  availableProperties: Property[] = [];
  availableClients: any[] = [];
  loading = false;
  selectedRealEstateId: number | null = null;
  selectedClient: Client | null = null;
  showAssignModal = false;
  showAddClientModal = false;
  clientForm: FormGroup;
  clientSubmitting = false;

  constructor(
    private route: ActivatedRoute,
    private clientService: ClientService,
    private sellerService: SellerService,
    private fb: FormBuilder
  ) {
    this.clientForm = this.fb.group({
      userId: ['', [Validators.required]],
      propertyId: ['', [Validators.required]],
      assignedSellerId: [''],
      contractDate: [''],
      contractSigned: [false]
    });
  }

  ngOnInit(): void {
    // Get realEstateId from user session instead of route params
    this.loadUserRealEstate();
    this.loadClients();
    this.loadSellers();
    this.loadProperties();
    this.loadAvailableClients();
  }

  private loadUserRealEstate(): void {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      
      // Assuming the user object has realEstateId property
      this.selectedRealEstateId = user.realEstateId;
    }
  }

  loadClients(): void {
    this.loading = true;
    if (this.selectedRealEstateId) {
      this.clientService.getClientsByRealEstate(this.selectedRealEstateId)
        .subscribe({
          next: (response) => {
            this.clients = response.data;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error loading clients:', error);
            this.loading = false;
          }
        });
    } else {
      this.loading = false;
    }
  }

  loadSellers(): void {
    if (this.selectedRealEstateId) {
      // Use the sellerService to get sellers by real estate
      this.sellerService.getSellersByRealEstate(this.selectedRealEstateId)
        .subscribe({
          next: (response: { data: Seller[]; count: number }) => {
            this.sellers = response.data;
            console.log('Sellers response:', this.sellers);
          },
          error: (error: any) => {
            console.error('Error loading sellers:', error);
          }
        });
    }
  }

  assignSeller(client: Client): void {
    this.selectedClient = client;
    this.showAssignModal = true;
  }

  confirmAssignSeller(sellerId: number): void {
    if (this.selectedClient) {
      this.loading = true;
      this.clientService.assignSellerToClient(this.selectedClient.id, sellerId)
        .subscribe({
          next: () => {
            // Update the client in the list
            const seller = this.sellers.find(s => s.id === sellerId);
            if (seller) {
              this.selectedClient!.assigned_seller_id = sellerId;
              this.selectedClient!.assigned_seller_name = `${seller.first_name || ''} ${seller.last_name || ''}`;
              this.selectedClient!.assigned_seller = {
                id: seller.id,
                user_id: seller.user_id || seller.id,
                first_name: seller.first_name || '',
                last_name: seller.last_name || '',
                email: seller.email || '',
                phone: seller.phone
              };
            }
            this.showAssignModal = false;
            this.selectedClient = null;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error assigning seller:', error);
            this.loading = false;
          }
        });
    }
  }

  closeAssignModal(): void {
    this.showAssignModal = false;
    this.selectedClient = null;
  }

  // Add Client Modal Methods
  openAddClientModal(): void {
    this.showAddClientModal = true;
    this.clientForm.reset();
  }

  closeAddClientModal(): void {
    this.showAddClientModal = false;
    this.clientForm.reset();
  }

  loadProperties(): void {
    if (this.selectedRealEstateId) {
      this.clientService.getPropertiesByRealEstate(this.selectedRealEstateId)
        .subscribe({
          next: (response) => {
            this.availableProperties = response.data;
          },
          error: (error) => {
            console.error('Error loading properties:', error);
          }
        });
    }
  }

  loadAvailableClients(): void {
    if (this.selectedRealEstateId) {
      this.clientService.getAvailableClientsByRealEstate(this.selectedRealEstateId)
        .subscribe({
          next: (response: { data: any[]; count: number }) => {
            this.availableClients = response.data;
          },
          error: (error: any) => {
            console.error('Error loading available clients:', error);
          }
        });
    }
  }

  onSubmitClient(): void {
    if (this.clientForm.valid) {
      this.clientSubmitting = true;
      const formData = this.clientForm.value;

      const clientData = {
        userId: parseInt(formData.userId),
        propertyId: parseInt(formData.propertyId), // Selected property from dropdown
        realEstateId: this.selectedRealEstateId,
        assignedSellerId: formData.assignedSellerId ? parseInt(formData.assignedSellerId) : undefined, // Optional seller assignment
        contractDate: formData.contractDate || undefined,
        contractSigned: formData.contractSigned || false
      };

      this.clientService.createClient(clientData)
        .subscribe({
          next: (response) => {
            this.clientSubmitting = false;
            this.closeAddClientModal();
            this.loadClients(); // Refresh the clients list
            this.loadAvailableClients(); // Refresh available clients to exclude the newly created one
          },
          error: (error) => {
            console.error('Error creating client:', error);
            this.clientSubmitting = false;
          }
        });
    } else {
      this.markFormGroupTouched(this.clientForm);
    }
  }

  getClientFormError(fieldName: string): string {
    const control = this.clientForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (control.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['minlength'].requiredLength} characters`;
      }
      if (control.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} must not exceed ${control.errors['maxlength'].requiredLength} characters`;
      }
      if (control.errors['pattern']) {
        if (fieldName === 'phone') {
          return 'Please enter a valid phone number';
        }
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
      userId: 'Client',
      propertyId: 'Property'
    };
    return labels[fieldName] || fieldName;
  }

  getClientStatus(client: Client): string {
    if (client.contract_signed) {
      return 'Contract Signed';
    }
    return 'Pending Contract';
  }

  getStatusClass(client: Client): string {
    return client.contract_signed ? 'status-signed' : 'status-pending';
  }

  getProgressPercentage(client: Client): number {
    if (client.total_down_payment === 0) return 0;
    const paid = client.total_down_payment - client.remaining_balance;
    return Math.round((paid / client.total_down_payment) * 100);
  }
}
