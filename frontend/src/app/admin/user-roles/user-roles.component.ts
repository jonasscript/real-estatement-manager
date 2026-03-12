import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { HttpClient } from '@angular/common/http';

interface Role {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_active: boolean;
  role_id: number;
  current_role_name?: string;
  current_role_description?: string;
}

interface UserRole {
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  user_active: boolean;
  role_id: number;
  role_name: string;
  role_description: string;
  assigned_at: string;
}

interface ApiResponse<T> {
  message: string;
  data: T;
  count?: number;
}

@Component({
  selector: 'app-user-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DialogModule, ButtonModule],
  templateUrl: './user-roles.component.html',
  styleUrls: ['./user-roles.component.scss']
})
export class UserRolesComponent implements OnInit {
  private readonly API_URL = 'http://localhost:3000/api';

  userRoles: UserRole[] = [];
  roles: Role[] = [];
  users: User[] = [];
  roleStats: any[] = [];
  loading = false;
  showAssignDialog = false;
  showAddUsersDialog = false;
  selectedUser: User | null = null;
  selectedRoleId: number | null = null;
  selectedRole: Role | null = null;
  availableUsers: User[] = [];
  selectedUsers: number[] = [];

  assignForm: FormGroup;

  constructor(
    private readonly http: HttpClient,
    private readonly fb: FormBuilder
  ) {
    this.assignForm = this.fb.group({
      userId: [''],
      roleId: ['']
    });
  }

  ngOnInit(): void {
    this.loadUserRoles();
    this.loadRoles();
    this.loadRoleStatistics();
  }

  loadAvailableUsers(roleId: number): void {
    this.loading = true;
    this.http.get<ApiResponse<User[]>>(`${this.API_URL}/roles/${roleId}/available-users`).subscribe({
      next: (response) => {
        this.availableUsers = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading available users:', error);
        this.loading = false;
        alert('Error al cargar usuarios disponibles');
      }
    });
  }

  loadUserRoles(): void {
    this.loading = true;
    this.http.get<ApiResponse<UserRole[]>>(`${this.API_URL}/roles/user-roles/all`).subscribe({
      next: (response) => {
        this.userRoles = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading user roles:', error);
        this.loading = false;
      }
    });
  }

  loadRoles(): void {
    this.http.get<ApiResponse<Role[]>>(`${this.API_URL}/roles`).subscribe({
      next: (response) => {
        this.roles = response.data;
      },
      error: (error) => {
        console.error('Error loading roles:', error);
      }
    });
  }

  loadRoleStatistics(): void {
    this.http.get<ApiResponse<any[]>>(`${this.API_URL}/roles/user-roles/statistics`).subscribe({
      next: (response) => {
        this.roleStats = response.data;
      },
      error: (error) => {
        console.error('Error loading role statistics:', error);
      }
    });
  }

  getTotalAssignments(): number {
    return this.userRoles.length;
  }

  getTotalRoles(): number {
    return this.roles.length;
  }

  getActiveUsers(): number {
    return this.userRoles.filter(ur => ur.user_active).length;
  }

  getUsersByRole(roleName: string): UserRole[] {
    return this.userRoles.filter(ur => ur.role_name === roleName);
  }

  getRoleUserCount(roleId: number): number {
    return this.userRoles.filter(ur => ur.role_id === roleId).length;
  }

  getRoleName(roleId: number): string {
    const role = this.roles.find(r => r.id === roleId);
    return role?.name || 'N/A';
  }

  getRoleDescription(roleId: number): string {
    const role = this.roles.find(r => r.id === roleId);
    return role?.description || 'N/A';
  }

  openAssignDialog(userRole: UserRole): void {
    this.selectedUser = {
      id: userRole.user_id,
      email: userRole.email,
      first_name: userRole.first_name,
      last_name: userRole.last_name,
      phone: userRole.phone,
      is_active: userRole.user_active,
      role_id: userRole.role_id
    };
    this.selectedRoleId = userRole.role_id;
    this.assignForm.patchValue({
      userId: userRole.user_id,
      roleId: userRole.role_id
    });
    this.showAssignDialog = true;
  }

  closeAssignDialog(): void {
    this.showAssignDialog = false;
    this.selectedUser = null;
    this.selectedRoleId = null;
    this.assignForm.reset();
  }

  assignRole(): void {
    if (this.assignForm.invalid) {
      return;
    }

    const { userId, roleId } = this.assignForm.value;

    this.loading = true;
    this.http.post<ApiResponse<any>>(`${this.API_URL}/roles/assign`, { userId, roleId }).subscribe({
      next: (response) => {
        this.loadUserRoles();
        this.loadRoleStatistics();
        this.closeAssignDialog();
        this.loading = false;
        alert('Rol asignado exitosamente');
      },
      error: (error) => {
        console.error('Error assigning role:', error);
        alert(error.error?.error || 'Error al asignar el rol');
        this.loading = false;
      }
    });
  }

  changeUserRole(userRole: UserRole): void {
    this.openAssignDialog(userRole);
  }

  openAddUsersDialog(role: Role): void {
    this.selectedRole = role;
    this.selectedRoleId = role.id;
    this.selectedUsers = [];
    this.loadAvailableUsers(role.id);
    this.showAddUsersDialog = true;
  }

  closeAddUsersDialog(): void {
    this.showAddUsersDialog = false;
    this.selectedRole = null;
    this.selectedRoleId = null;
    this.availableUsers = [];
    this.selectedUsers = [];
  }

  toggleUserSelection(userId: number): void {
    const index = this.selectedUsers.indexOf(userId);
    if (index > -1) {
      this.selectedUsers.splice(index, 1);
    } else {
      this.selectedUsers.push(userId);
    }
  }

  isUserSelected(userId: number): boolean {
    return this.selectedUsers.includes(userId);
  }

  selectAllUsers(): void {
    this.selectedUsers = this.availableUsers.map(u => u.id);
  }

  deselectAllUsers(): void {
    this.selectedUsers = [];
  }

  addUsersToRole(): void {
    if (this.selectedUsers.length === 0) {
      alert('Selecciona al menos un usuario');
      return;
    }

    if (!this.selectedRoleId) {
      alert('Error: Rol no seleccionado');
      return;
    }

    const assignments = this.selectedUsers.map(userId => ({
      userId,
      roleId: this.selectedRoleId!
    }));

    this.loading = true;
    this.http.post<ApiResponse<any>>(`${this.API_URL}/roles/bulk-assign`, { assignments }).subscribe({
      next: (response) => {
        this.loadUserRoles();
        this.loadRoleStatistics();
        this.closeAddUsersDialog();
        this.loading = false;
        alert(`${this.selectedUsers.length} usuario(s) asignado(s) exitosamente al rol`);
      },
      error: (error) => {
        console.error('Error adding users to role:', error);
        alert(error.error?.error || 'Error al asignar usuarios al rol');
        this.loading = false;
      }
    });
  }
}
