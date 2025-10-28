import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientService, Client, Property } from '../../services/client.service';
import { SellerService, Seller } from '../../services/seller.service';
import { UserService } from '../../services/user.service';

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: number;
  realEstateId?: number;
}

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
  loading = false;
  selectedRealEstateId: number | null = null;
  selectedClient: Client | null = null;
  showAssignModal = false;
  showAddClientModal = false;
  clientForm: FormGroup;
  clientSubmitting = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly clientService: ClientService,
    private readonly sellerService: SellerService,
    private readonly userService: UserService,
    private readonly fb: FormBuilder
  ) {
    // Nuevo formulario siguiendo la estructura de users component
    this.clientForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      roleId: ['4'], // Siempre cliente
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
  }

  private loadUserRealEstate(): void {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      
      // Use real_estate_id like in users component
      this.selectedRealEstateId = user.real_estate_id;
    }
  }

  loadClients(): void {
    this.loading = true;
    if (this.selectedRealEstateId) {
      this.clientService.getClientsByRealEstate(this.selectedRealEstateId)
        .subscribe({
          next: (response) => {
            this.clients = response.data;
            console.log('Clients data received:', this.clients);
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
    this.clientForm.reset({ roleId: '4', contractSigned: false });
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

  onSubmitClient(): void {
    if (this.clientForm.valid && this.selectedRealEstateId) {
      console.log(
        'Submitting client form with data:',
        this.clientForm.value,
        this.selectedRealEstateId
      );
      this.clientSubmitting = true;
      const formData = this.clientForm.value;

      const userData: CreateUserData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        roleId: 4, // Siempre cliente
        realEstateId: this.selectedRealEstateId,
      };

      // Primero crear el usuario
      this.userService.createUser(userData).subscribe({
        next: (userResponse) => {
          // Crear registro de cliente
          const clientData = {
            userId: userResponse.data.id,
            propertyId: formData.propertyId ? Number.parseInt(formData.propertyId) : 0,
            realEstateId: this.selectedRealEstateId!,
            assignedSellerId: formData.assignedSellerId
              ? Number.parseInt(formData.assignedSellerId)
              : null,
            contractDate: formData.contractDate || undefined,
            contractSigned: formData.contractSigned || false,
          };

          this.clientService.createClient(clientData).subscribe({
            next: (clientResponse) => {
              this.clientSubmitting = false;
              this.closeAddClientModal();
              this.loadClients();
              alert('Cliente creado exitosamente');
            },
            error: (clientError) => {
              console.error('Error creating client:', clientError);
              this.clientSubmitting = false;
              alert('Usuario creado pero falló la creación del registro de cliente');
            },
          });
        },
        error: (userError) => {
          console.error('Error creando usuario:', userError);
          this.clientSubmitting = false;
          alert('Error al crear el usuario');
        },
      });
    } else {
      console.log('Form is invalid. Errors:', this.getFormErrors());
      this.markFormGroupTouched(this.clientForm);
    }
  }

  getClientFormError(fieldName: string): string {
    const control = this.clientForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      }
      if (control.errors['email']) {
        return 'Por favor ingresa una dirección de correo válida';
      }
      if (control.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} debe tener al menos ${control.errors['minlength'].requiredLength} caracteres`;
      }
      if (control.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} no debe exceder ${control.errors['maxlength'].requiredLength} caracteres`;
      }
      if (control.errors['pattern']) {
        if (fieldName === 'phone') {
          return 'Por favor ingresa un número de teléfono válido';
        }
      }
    }
    return '';
  }

  private getFormErrors(): any {
    let formErrors: any = {};
    for (const key of Object.keys(this.clientForm.controls)) {
      const controlErrors = this.clientForm.get(key)?.errors;
      if (controlErrors) {
        formErrors[key] = controlErrors;
      }
    }
    return formErrors;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    for (const key of Object.keys(formGroup.controls)) {
      const control = formGroup.get(key);
      control?.markAsTouched();
    }
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      email: 'Correo Electrónico',
      password: 'Contraseña',
      firstName: 'Nombre',
      lastName: 'Apellido',
      phone: 'Teléfono',
      roleId: 'Rol',
      propertyId: 'Propiedad',
      userId: 'Cliente'
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

  getActiveClientsCount(): number {
    return this.clients.filter(c => c.contract_signed).length;
  }

  getPendingClientsCount(): number {
    return this.clients.filter(c => !c.contract_signed).length;
  }
}
