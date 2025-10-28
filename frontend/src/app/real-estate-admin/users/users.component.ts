import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, User } from '../../services/user.service';
import { DialogModule } from 'primeng/dialog';

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId?: number; // Opcional ya que se asigna automáticamente en el backend para vendedores
  realEstateId?: number;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DialogModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  loading = false;
  selectedRealEstateId: number | null = null;
  showAddUserModal = false;
  userForm: FormGroup;
  userSubmitting = false;

  // Edit user variables
  showEditDialog = false;
  editingUser: User | null = null;
  editForm: FormGroup;

  constructor(
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
    });

    this.editForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      email: [''],
      isActive: [true],
    });
  }

  ngOnInit(): void {
    this.loadUserRealEstate();
    this.loadUsers();
  }

  private loadUserRealEstate(): void {
    const userData = sessionStorage.getItem('user');
    console.log('User data from sessionStorage:', userData);
    if (userData) {
      const user = JSON.parse(userData);
      this.selectedRealEstateId = user.real_estate_id;
    }
  }

  loadUsers(): void {
    this.loading = true;
    if (this.selectedRealEstateId) {
      // Obtener vendedores por inmobiliaria
      this.userService
        .getSellersByRealEstate(this.selectedRealEstateId)
        .subscribe({
          next: (response) => {
            this.users = response.data;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error cargando vendedores:', error);
            this.loading = false;
          },
        });
    } else {
      this.loading = false;
    }
  }

  // Add User Modal Methods
  openAddUserModal(): void {
    this.showAddUserModal = true;
  }

  closeAddUserModal(): void {
    this.showAddUserModal = false;
    this.userForm.reset();
  }

  onSubmitUser(): void {
    if (this.userForm.valid && this.selectedRealEstateId) {
      console.log(
        'Submitting seller form with data:',
        this.userForm.value,
        this.selectedRealEstateId
      );
      this.userSubmitting = true;
      const formData = this.userForm.value;

      const userData: CreateUserData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        realEstateId: this.selectedRealEstateId,
      };

      // Crear el vendedor (usuario + registro en tabla sellers)
      this.userService.createSellerUser(userData).subscribe({
        next: (userResponse) => {
          this.userSubmitting = false;
          this.closeAddUserModal();
          this.loadUsers();
          alert('Vendedor creado exitosamente');
          console.log('Seller user created:', userResponse);
        },
        error: (userError) => {
          console.error('Error creando vendedor:', userError);
          this.userSubmitting = false;
          alert('Error al crear el vendedor');
        },
      });
    } else {
      console.log('Form is invalid. Errors:', this.getFormErrors());
      this.markFormGroupTouched(this.userForm);
    }
  }

  private getFormErrors(): any {
    let formErrors: any = {};
    Object.keys(this.userForm.controls).forEach(key => {
      const controlErrors = this.userForm.get(key)?.errors;
      if (controlErrors) {
        formErrors[key] = controlErrors;
      }
    });
    return formErrors;
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
        return `${this.getFieldLabel(fieldName)} debe tener al menos ${control.errors['minlength'].requiredLength
          } caracteres`;
      }
    }
    return '';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
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
      propertyId: 'Propiedad',
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
    return user.role_name || this.getRoleNameById(user.role_id);
  }

  private getRoleNameById(roleId: number): string {
    switch (roleId) {
      case 1:
        return 'Administrador del Sistema';
      case 2:
        return 'Administrador de Inmobiliaria';
      case 3:
        return 'Vendedor';
      case 4:
        return 'Cliente';
      default:
        return 'Desconocido';
    }
  }

  getActiveUsersCount(): number {
    return this.users.filter((u) => u.is_active).length;
  }

  getInactiveUsersCount(): number {
    return this.users.filter((u) => !u.is_active).length;
  }

  // Edit user methods
  openEditModal(user: User): void {
    this.editingUser = user;
    this.editForm.patchValue({
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone || '',
      email: user.email,
      isActive: user.is_active,
    });
    this.showEditDialog = true;
  }

  cancelEdit(): void {
    this.showEditDialog = false;
    this.editingUser = null;
    this.editForm.reset();
  }

  onUpdateUser(): void {
    if (this.editForm.invalid || !this.editingUser) return;

    this.loading = true;
    const updateData = {
      firstName: this.editForm.value.firstName,
      lastName: this.editForm.value.lastName,
      phone: this.editForm.value.phone,
      isActive: this.editForm.value.isActive,
    };

    this.userService.updateUser(this.editingUser.id, updateData).subscribe({
      next: (response) => {
        console.log('User updated successfully:', response);
        this.loadUsers();
        this.cancelEdit();
        this.loading = false;
        alert('Usuario actualizado exitosamente');
      },
      error: (error) => {
        console.error('Error updating user:', error);
        this.loading = false;
        alert('Error al actualizar el usuario');
      },
    });
  }

  deleteUser(user: User): void {
    if (
      !confirm(
        `¿Está seguro que desea desactivar al usuario ${user.first_name} ${user.last_name}?`
      )
    ) {
      return;
    }

    this.loading = true;
    this.userService.deleteUser(user.id).subscribe({
      next: (response) => {
        console.log('User deactivated successfully:', response);
        this.loadUsers();
        this.loading = false;
        alert('Usuario desactivado exitosamente');
      },
      error: (error) => {
        console.error('Error deactivating user:', error);
        this.loading = false;
        alert('Error al desactivar el usuario');
      },
    });
  }
}
