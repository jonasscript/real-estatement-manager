import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

interface Role {
  id: number;
  name: string;
  description: string;
  created_at: string;
  user_count?: number;
}

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  current_role_name?: string;
  current_role_description?: string;
}

interface ApiResponse<T> {
  message: string;
  data: T;
  count?: number;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DialogModule, ButtonModule],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss']
})
export class RolesComponent implements OnInit {
  private readonly API_URL = 'http://localhost:3000/api/roles';

  roles: Role[] = [];
  roleStats: Role[] = [];
  availableUsers: User[] = [];
  loading = false;
  showCreateDialog = false;
  showEditDialog = false;
  showAssignUserDialog = false;
  editingRole: Role | null = null;
  selectedRole: Role | null = null;
  selectedUserId: number | null = null;

  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private readonly http: HttpClient,
    private readonly fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern(/^[a-z_]+$/)]],
      description: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern(/^[a-z_]+$/)]],
      description: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]]
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadRoleStatistics();
  }

  loadRoles(): void {
    this.loading = true;
    this.http.get<ApiResponse<Role[]>>(this.API_URL).subscribe({
      next: (response) => {
        this.roles = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        this.loading = false;
      }
    });
  }

  loadRoleStatistics(): void {
    this.http.get<ApiResponse<Role[]>>(`${this.API_URL}/statistics/all`).subscribe({
      next: (response) => {
        this.roleStats = response.data;
      },
      error: (error) => {
        console.error('Error loading role statistics:', error);
      }
    });
  }

  getTotalRoles(): number {
    return this.roles.length;
  }

  getTotalUsers(): number {
    return this.roleStats.reduce((sum, role) => sum + (role.user_count || 0), 0);
  }

  getSystemRolesCount(): number {
    return this.roles.filter(r => r.name === 'system_admin').length;
  }

  getRoleUserCount(roleId: number): number {
    const role = this.roleStats.find(r => r.id === roleId);
    return role?.user_count || 0;
  }

  openCreateDialog(): void {
    this.createForm.reset();
    this.showCreateDialog = true;
  }

  closeCreateDialog(): void {
    this.showCreateDialog = false;
    this.createForm.reset();
  }

  createRole(): void {
    if (this.createForm.invalid) {
      return;
    }

    this.loading = true;
    this.http.post<ApiResponse<Role>>(this.API_URL, this.createForm.value).subscribe({
      next: (response) => {
        this.loadRoles();
        this.loadRoleStatistics();
        this.closeCreateDialog();
        this.loading = false;
        alert('Rol creado exitosamente');
      },
      error: (error) => {
        console.error('Error creating role:', error);
        alert(error.error?.error || 'Error al crear el rol');
        this.loading = false;
      }
    });
  }

  openEditDialog(role: Role): void {
    this.editingRole = role;
    this.editForm.patchValue({
      name: role.name,
      description: role.description
    });
    this.showEditDialog = true;
  }

  closeEditDialog(): void {
    this.showEditDialog = false;
    this.editingRole = null;
    this.editForm.reset();
  }

  updateRole(): void {
    if (this.editForm.invalid || !this.editingRole) {
      return;
    }

    this.loading = true;
    this.http.put<ApiResponse<Role>>(`${this.API_URL}/${this.editingRole.id}`, this.editForm.value).subscribe({
      next: (response) => {
        this.loadRoles();
        this.loadRoleStatistics();
        this.closeEditDialog();
        this.loading = false;
        alert('Rol actualizado exitosamente');
      },
      error: (error) => {
        console.error('Error updating role:', error);
        alert(error.error?.error || 'Error al actualizar el rol');
        this.loading = false;
      }
    });
  }

  deleteRole(role: Role): void {
    if (!confirm(`¿Estás seguro de eliminar el rol "${role.name}"?`)) {
      return;
    }

    this.loading = true;
    this.http.delete<ApiResponse<Role>>(`${this.API_URL}/${role.id}`).subscribe({
      next: () => {
        this.loadRoles();
        this.loadRoleStatistics();
        this.loading = false;
        alert('Rol eliminado exitosamente');
      },
      error: (error) => {
        console.error('Error deleting role:', error);
        alert(error.error?.error || 'Error al eliminar el rol');
        this.loading = false;
      }
    });
  }

  openAssignUserDialog(role: Role): void {
    this.selectedRole = role;
    this.selectedUserId = null;
    this.loadAvailableUsersForRole(role.id);
    this.showAssignUserDialog = true;
  }

  closeAssignUserDialog(): void {
    this.showAssignUserDialog = false;
    this.selectedRole = null;
    this.selectedUserId = null;
    this.availableUsers = [];
  }

  loadAvailableUsersForRole(roleId: number): void {
    this.loading = true;
    this.http.get<ApiResponse<User[]>>(`${this.API_URL}/${roleId}/available-users`).subscribe({
      next: (response) => {
        this.availableUsers = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading available users:', error);
        alert('Error al cargar usuarios disponibles');
        this.loading = false;
      }
    });
  }

  assignUserToRole(): void {
    if (!this.selectedUserId || !this.selectedRole) {
      return;
    }

    this.loading = true;
    const payload = {
      userId: this.selectedUserId,
      roleId: this.selectedRole.id
    };

    this.http.post<ApiResponse<any>>(`${this.API_URL}/assign`, payload).subscribe({
      next: () => {
        this.loadRoles();
        this.loadRoleStatistics();
        this.closeAssignUserDialog();
        this.loading = false;
        alert('Usuario asignado exitosamente al rol');
      },
      error: (error) => {
        console.error('Error assigning user to role:', error);
        alert(error.error?.error || 'Error al asignar usuario al rol');
        this.loading = false;
      }
    });
  }
}
