import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { UserService, User, RoleService, Role } from '../../services/user.service';
import { RealEstateService, RealEstate } from '../../services/real-estate.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  roles: Role[] = [];
  realEstates: RealEstate[] = [];
  loading = false;
  showCreateForm = false;
  editingUser: User | null = null;
  changingPasswordUser: User | null = null;
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
      roleId: ['', [Validators.required]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    this.editForm = this.fb.group({
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
    const filters = this.selectedRole ? { role: this.selectedRole } : {};

    this.userService.getAllUsers(filters)
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

  onCreate(): void {
    if (this.createForm.valid) {
      this.loading = true;
      const userData = {
        ...this.createForm.value,
        roleId: parseInt(this.createForm.value.roleId),
        realEstateId: parseInt(this.createForm.value.realEstateId)
      };

      this.userService.createUser(userData)
        .subscribe({
          next: (response) => {
            this.users.unshift(response.data);
            this.createForm.reset();
            this.showCreateForm = false;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error creating user:', error);
            this.loading = false;
          }
        });
    }
  }

  onEdit(user: User): void {
    this.editingUser = user;
    this.editForm.patchValue({
      firstName: user.firstName,
      lastName: user.lastName,
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
    if (confirm(`Are you sure you want to delete "${user.firstName} ${user.lastName}"?`)) {
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
  }

  // Password change methods
  onChangePassword(user: User): void {
    this.changingPasswordUser = user;
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

  getRoleDescription(roleName: string): string {
    const role = this.roles.find(r => r.name === roleName);
    return role ? role.description : roleName;
  }
}
