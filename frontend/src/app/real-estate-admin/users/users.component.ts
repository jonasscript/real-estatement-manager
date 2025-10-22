import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, User } from '../../services/user.service';
import { ClientService, Property } from '../../services/client.service';
import { SellerService, Seller } from '../../services/seller.service';

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
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})

export class UsersComponent implements OnInit {
  users: User[] = [];
  availableProperties: Property[] = [];
  loading = false;
  selectedRealEstateId: number | null = null;
  showAddUserModal = false;
  userForm: FormGroup;
  userSubmitting = false;
  availableSellers: Seller[] = [];

  constructor(
    private userService: UserService,
    private clientService: ClientService,
    private sellerService: SellerService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      roleId: [4, [Validators.required]], // Por defecto rol cliente
      propertyId: ['', [Validators.required]],
      assignedSellerId: [''],
      contractDate: [''],
      contractSigned: [false]
    });
  }

  ngOnInit(): void {
    this.loadUserRealEstate();
    this.loadUsers();
    this.loadProperties();
  }

  private loadUserRealEstate(): void {
    const userData = sessionStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.selectedRealEstateId = user.realEstateId;
    }
  }

  loadAvailableSellers(): void {
    if (this.selectedRealEstateId) {
      this.sellerService.getSellersByRealEstate(this.selectedRealEstateId)
        .subscribe({
          next: (response) => {
            this.availableSellers = response.data;
          },
          error: (error) => {
            console.error('Error cargando vendedores:', error);
          }
        });
    }
  }

  loadUsers(): void {
    this.loading = true;
    if (this.selectedRealEstateId) {
      // Obtener usuarios por inmobiliaria (solo clientes para real_estate_admin)
      this.userService.getClientsByRealEstate(this.selectedRealEstateId)
        .subscribe({
          next: (response) => {
            // Filtrar para mostrar solo clientes (roleId = 4)
            this.users = response.data;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error cargando usuarios:', error);
            this.loading = false;
          }
        });
    } else {
      this.loading = false;
    }
  }

  // Add User Modal Methods
  openAddUserModal(): void {
    this.loadAvailableSellers();
    this.showAddUserModal = true;
    this.userForm.reset({ roleId: 4 }); // Resetear a rol cliente
  }

  closeAddUserModal(): void {
    this.showAddUserModal = false;
    this.userForm.reset({ roleId: 4, contractSigned: false });
  }

  loadProperties(): void {
    if (this.selectedRealEstateId) {
      this.clientService.getPropertiesByRealEstate(this.selectedRealEstateId)
        .subscribe({
          next: (response) => {
            this.availableProperties = response.data;
          },
          error: (error) => {
            console.error('Error cargando propiedades:', error);
          }
        });
    }
  }

  onSubmitUser(): void {
    if (this.userForm.valid && this.selectedRealEstateId) {
      this.userSubmitting = true;
      const formData = this.userForm.value;

      const userData: CreateUserData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        roleId: parseInt(formData.roleId),
        realEstateId: this.selectedRealEstateId
      };

      // Primero crear el usuario
      this.userService.createUser(userData)
        .subscribe({
          next: (userResponse) => {
            // After user is created, create the client record
            const clientData = {
              userId: userResponse.data.id,
              propertyId: formData.propertyId ? parseInt(formData.propertyId) : 0, // Use 0 as placeholder if no property selected
              realEstateId: this.selectedRealEstateId!,
              assignedSellerId: formData.assignedSellerId ? parseInt(formData.assignedSellerId) : null,
              contractDate: formData.contractDate || undefined,
              contractSigned: formData.contractSigned || false
            };

            this.clientService.createClient(clientData)
              .subscribe({
                next: (clientResponse) => {
                  this.userSubmitting = false;
                  this.closeAddUserModal();
                  this.loadUsers(); // Refresh the users list
                },
                error: (clientError) => {
                  console.error('Error creating client:', clientError);
                  this.userSubmitting = false;
                  // Nota: Usuario creado pero falló la creación del cliente
                  // Podrías mostrar una advertencia o manejar este caso
                }
              });
          },
          error: (userError) => {
            console.error('Error creando usuario:', userError);
            this.userSubmitting = false;
          }
        });
    } else {
      this.markFormGroupTouched(this.userForm);
    }
  }

  getUserFormError(fieldName: string): string {
    const control = this.userForm.get(fieldName);
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
      email: 'Correo Electrónico',
      password: 'Contraseña',
      firstName: 'Nombre',
      lastName: 'Apellido',
      phone: 'Teléfono',
      roleId: 'Rol',
      propertyId: 'Propiedad'
    };
    return labels[fieldName] || fieldName;
  }

  getUserStatus(user: User): string {
    return user.is_active ? 'Activo' : 'Inactivo';
  }

  getStatusClass(user: User): string {
    return user.is_active ? 'status-active' : 'status-inactive';
  }

  getRoleName(user: User): string {
    return user.roleName || this.getRoleNameById(user.role_id);
  }

  private getRoleNameById(roleId: number): string {
    switch (roleId) {
      case 1: return 'Administrador del Sistema';
      case 2: return 'Administrador de Inmobiliaria';
      case 3: return 'Vendedor';
      case 4: return 'Cliente';
      default: return 'Desconocido';
    }
  }

  getActiveUsersCount(): number {
    return this.users.filter(u => u.is_active).length;
  }

  getInactiveUsersCount(): number {
    return this.users.filter(u => !u.is_active).length;
  }

  getProgressPercentage(user: User): number {
    if (!user.total_down_payment || user.total_down_payment === 0) return 0;
    const paid = user.total_down_payment - (user.remaining_balance || 0);
    return Math.round((paid / user.total_down_payment) * 100);
  }
}