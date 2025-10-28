import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { UserService, User, RoleService, Role } from '../../services/user.service';
import { RealEstateService, RealEstate } from '../../services/real-estate.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DialogModule, ButtonModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  roles: Role[] = [];
  realEstates: RealEstate[] = [];
  loading = false;
  showCreateForm = false;
  showCreateDialog = false;
  editingUser: User | null = null;
  showEditDialog = false;
  changingPasswordUser: User | null = null;
  showPasswordDialog = false;
  selectedRole: string = '';

  createForm: FormGroup;
  editForm: FormGroup;
  passwordForm: FormGroup;

  constructor(
    private userService: UserService,
    private roleService: RoleService,
    private realEstateService: RealEstateService,
    private fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      realEstateId: ['', [Validators.required]],
      roleId: ['2', [Validators.required]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    // Listen to role changes to update form validation
    this.createForm.get('roleId')?.valueChanges.subscribe(roleId => {
      this.updateFormValidations(parseInt(roleId));
    });

    this.editForm = this.fb.group({
      roleId: ['', [Validators.required]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      isActive: [true]
    });

    this.passwordForm = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.loadRealEstates();
  }

  loadUsers(): void {
    this.loading = true;
    
    // Get roleId from logged-in user
    const userData: User = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (!userData) {
      console.error('No user data found in session');
      this.loading = false;
      return;
    }
    
    const roleId = userData.role_id;

    this.userService.getUsersByRoleId(roleId)
      .subscribe({
        next: (response) => {
          this.users = response.data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.loading = false;
        }
      });
  }

  loadRoles(): void {
    this.roleService.getAdminRoles()
      .subscribe({
        next: (response) => {
          this.roles = response.data;
        },
        error: (error) => {
          console.error('Error loading roles:', error);
          // Fallback to hardcoded admin roles if API fails
          this.roles = [
            { id: 3, name: 'seller', description: 'Real Estate Seller' },
            { id: 4, name: 'client', description: 'Property Client' }
          ];
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

  onRoleFilterChange(): void {
    this.loadUsers();
  }

  // Method to update form validations based on role selection
  updateFormValidations(roleId: number): void {
    const realEstateIdControl = this.createForm.get('realEstateId');
    
    if (roleId === 1) {
      // Role 1 (system_admin) doesn't need real estate assignment
      realEstateIdControl?.clearValidators();
      realEstateIdControl?.setValue('');
    } else {
      // Other roles need real estate assignment
      realEstateIdControl?.setValidators([Validators.required]);
    }
    
    realEstateIdControl?.updateValueAndValidity();
  }

  // Getter to check if real estate field should be shown
  get shouldShowRealEstateField(): boolean {
    const roleId = parseInt(this.createForm.get('roleId')?.value || '0');
    return roleId !== 1;
  }

  onCreate(): void {
    if (this.createForm.valid) {
      this.loading = true;
      const formValue = this.createForm.value;
      const userData = {
        ...formValue,
        roleId: parseInt(formValue.roleId),
        // Only include realEstateId if it's not empty (for non-system-admin roles)
        ...(formValue.realEstateId && { realEstateId: parseInt(formValue.realEstateId) })
      };

      console.log('Creating user with data:', userData);

      this.userService.createUser(userData)
        .subscribe({
          next: (response) => {
            this.users.unshift(response.data);
            this.createForm.reset();
            this.showCreateForm = false;
            this.showCreateDialog = false;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error creating user:', error);
            this.loading = false;
          }
        });
    } else {
      console.log('Form is invalid. Form errors:', this.getFormErrors());
    }
  }

  onEdit(user: User): void {
    this.editingUser = user;
    this.showEditDialog = true;
    this.editForm.patchValue({
      roleId: user.role_id,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone || '',
      isActive: user.is_active
    });
  }

  onUpdate(): void {
    if (this.editForm.valid && this.editingUser) {
      this.loading = true;
      this.userService.updateUser(this.editingUser!.id, this.editForm.value)
        .subscribe({
          next: (response) => {
            const index = this.users.findIndex(u => u.id === this.editingUser!.id);
            if (index !== -1) {
              this.users[index] = response.data;
            }
            this.editingUser = null;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error updating user:', error);
            this.loading = false;
          }
        });
    }
  }

  onDelete(user: User): void {
    if (confirm(`Are you sure you want to delete "${user.first_name} ${user.last_name}"?`)) {
      this.loading = true;
      this.userService.deleteUser(user.id)
        .subscribe({
          next: () => {
            this.users = this.users.filter(u => u.id !== user.id);
            this.loading = false;
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            this.loading = false;
          }
        });
    }
  }

  cancelEdit(): void {
    this.editingUser = null;
    this.showEditDialog = false;
  }

  // Password change methods
  onChangePassword(user: User): void {
    this.changingPasswordUser = user;
    this.showPasswordDialog = true;
    this.passwordForm.reset();
  }

  onUpdatePassword(): void {
    if (this.passwordForm.valid && this.changingPasswordUser) {
      this.loading = true;
      const password = this.passwordForm.get('password')?.value;

      this.userService.changePassword(this.changingPasswordUser.id, password)
        .subscribe({
          next: () => {
            this.loading = false;
            this.cancelPasswordChange();
            // Show success message (you can implement a toast service)
            alert('Password changed successfully');
          },
          error: (error) => {
            console.error('Error changing password:', error);
            this.loading = false;
            alert('Error changing password');
          }
        });
    }
  }

  cancelPasswordChange(): void {
    this.changingPasswordUser = null;
    this.showPasswordDialog = false;
    this.passwordForm.reset();
  }

  // Password validation
  passwordMatchValidator(group: any): any {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.createForm.reset();
    }
  }

  openCreateDialog(): void {
    this.showCreateDialog = true;
  }

  cancelCreate(): void {
    this.showCreateDialog = false;
    this.createForm.reset({
      email: '',
      realEstateId: '',
      roleId: '',
      firstName: '',
      lastName: '',
      phone: '',
      password: ''
    });
  }

  getActiveUsersCount(): number {
    return this.users.filter(u => u.is_active).length;
  }

  getInactiveUsersCount(): number {
    return this.users.filter(u => !u.is_active).length;
  }

  // Helper method for debugging form errors
  private getFormErrors(): any {
    let formErrors: any = {};
    for (const key of Object.keys(this.createForm.controls)) {
      const controlErrors = this.createForm.get(key)?.errors;
      if (controlErrors) {
        formErrors[key] = controlErrors;
      }
    }
    return formErrors;
  }
}
