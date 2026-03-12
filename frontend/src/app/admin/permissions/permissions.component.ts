import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { PermissionService, Permission, CreatePermissionData, UpdatePermissionData, AssignedRole } from '../../services/permission.service';
import { RoleService, Role } from '../../services/role.service';
import { ComponentService, Component as AppComponent } from '../../services/component.service';
import { ActionService, Action as AppAction } from '../../services/action.service';

interface ApiResponse<T> {
  message: string;
  data: T;
  count?: number;
}

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './permissions.component.html',
  styleUrls: ['./permissions.component.scss']
})
export class PermissionsComponent implements OnInit {
  permissions: Permission[] = [];
  groupedPermissions: Map<string, Permission[]> = new Map();
  components: AppComponent[] = [];
  actions: AppAction[] = [];
  loading = false;
  showDialog = false;
  showDeleteDialog = false;
  showRolesDialog = false;
  isEditMode = false;
  selectedPermission: Permission | null = null;
  roles: Role[] = [];
  savingRoles = false;
  selectedRolesForNewPermission: Set<number> = new Set();

  permissionForm: FormGroup;

  constructor(
    private readonly permissionService: PermissionService,
    private readonly roleService: RoleService,
    private readonly componentService: ComponentService,
    private readonly actionService: ActionService,
    private readonly fb: FormBuilder
  ) {
    this.permissionForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[a-z_]+$/)]],
      description: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]],
      componentId: [null, [Validators.required]],
      actionId: [null, [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadPermissions();
    this.loadRoles();
    this.loadComponents();
    this.loadActions();
  }

  loadComponents(): void {
    this.componentService.getAllComponents().subscribe({
      next: (response) => {
        this.components = response.data;
      },
      error: (error) => {
        console.error('Error loading components:', error);
      }
    });
  }

  loadActions(): void {
    this.actionService.getAllActions().subscribe({
      next: (response) => {
        this.actions = response.data;
      },
      error: (error) => {
        console.error('Error loading actions:', error);
      }
    });
  }

  loadPermissions(): void {
    this.loading = true;
    this.permissionService.getAllPermissions().subscribe({
      next: (response) => {
        this.permissions = response.data;
        this.groupPermissionsByComponent();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
        this.loading = false;
        alert('Error al cargar los permisos');
      }
    });
  }

  groupPermissionsByComponent(): void {
    this.groupedPermissions.clear();
    this.permissions.forEach(permission => {
      const component = permission.component_name || `Component ${permission.component_id}`;
      if (!this.groupedPermissions.has(component)) {
        this.groupedPermissions.set(component, []);
      }
      this.groupedPermissions.get(component)!.push(permission);
    });
  }

  getComponentNames(): string[] {
    return Array.from(this.groupedPermissions.keys()).sort();
  }

  getPermissionsByComponent(componentName: string): Permission[] {
    return this.groupedPermissions.get(componentName) || [];
  }

  getTotalPermissions(): number {
    return this.permissions.length;
  }

  getTotalComponents(): number {
    return this.groupedPermissions.size;
  }

  getActionCount(action: string): number {
    return this.permissions.filter(p => p.action === action).length;
  }

  getTotalRolesAssigned(): number {
    const uniqueRoles = new Set<number>();
    this.permissions.forEach(p => {
      if (p.assigned_roles) {
        p.assigned_roles.forEach((role: AssignedRole) => uniqueRoles.add(role.role_id));
      }
    });
    return uniqueRoles.size;
  }

  getPermissionRoleCount(permission: Permission): number {
    return permission.assigned_roles?.length || 0;
  }

  getRoleBadgeClass(roleName: string): string {
    const roleClasses: { [key: string]: string } = {
      'system_admin': 'role-badge-admin',
      'real_estate_admin': 'role-badge-real-estate',
      'seller': 'role-badge-seller',
      'client': 'role-badge-client'
    };
    return roleClasses[roleName] || 'role-badge-default';
  }

  openCreateDialog(): void {
    this.isEditMode = false;
    this.selectedPermission = null;
    this.selectedRolesForNewPermission.clear();
    this.permissionForm.reset();
    this.showDialog = true;
  }

  openEditDialog(permission: Permission): void {
    this.isEditMode = true;
    this.selectedPermission = permission;
    this.selectedRolesForNewPermission.clear();
    if (permission.assigned_roles) {
      permission.assigned_roles.forEach((role: AssignedRole) => {
        this.selectedRolesForNewPermission.add(role.role_id);
      });
    }
    this.permissionForm.patchValue({
      name: permission.name,
      description: permission.description,
      componentId: permission.component_id,
      actionId: permission.action_id
    });
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.selectedPermission = null;
    this.permissionForm.reset();
  }

  openDeleteDialog(permission: Permission): void {
    this.selectedPermission = permission;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.selectedPermission = null;
  }

  savePermission(): void {
    if (this.permissionForm.invalid) {
      Object.keys(this.permissionForm.controls).forEach(key => {
        this.permissionForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.permissionForm.value;
    this.loading = true;

    if (this.isEditMode && this.selectedPermission) {
      const updateData: UpdatePermissionData = {
        name: formValue.name,
        description: formValue.description,
        componentId: formValue.componentId,
        actionId: formValue.actionId
      };
      this.permissionService.updatePermission(this.selectedPermission.id, updateData).subscribe({
        next: (response) => {
          this.loadPermissions();
          this.closeDialog();
          this.loading = false;
          alert('Permiso actualizado exitosamente');
        },
        error: (error) => {
          console.error('Error updating permission:', error);
          alert(error.error?.error || 'Error al actualizar el permiso');
          this.loading = false;
        }
      });
    } else {
      const createData: CreatePermissionData = {
        name: formValue.name,
        description: formValue.description,
        componentId: formValue.componentId,
        actionId: formValue.actionId
      };
      this.permissionService.createPermission(createData).subscribe({
        next: (response) => {
          const newPermission = response.data;
          // Asignar roles seleccionados
          if (this.selectedRolesForNewPermission.size > 0) {
            this.assignRolesToNewPermission(newPermission.id);
          } else {
            this.loadPermissions();
            this.closeDialog();
            this.loading = false;
            alert('Permiso creado exitosamente');
          }
        },
        error: (error) => {
          console.error('Error creating permission:', error);
          alert(error.error?.error || 'Error al crear el permiso');
          this.loading = false;
        }
      });
    }
  }

  confirmDelete(): void {
    if (!this.selectedPermission) return;

    this.loading = true;
    this.permissionService.deletePermission(this.selectedPermission.id).subscribe({
      next: (response) => {
        this.loadPermissions();
        this.closeDeleteDialog();
        this.loading = false;
        alert('Permiso eliminado exitosamente');
      },
      error: (error) => {
        console.error('Error deleting permission:', error);
        alert(error.error?.error || 'Error al eliminar el permiso');
        this.loading = false;
      }
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.permissionForm.get(fieldName);
    if (control?.hasError('required')) return 'Este campo es requerido';
    if (control?.hasError('minlength')) return `Mínimo ${control.errors?.['minlength'].requiredLength} caracteres`;
    if (control?.hasError('maxlength')) return `Máximo ${control.errors?.['maxlength'].requiredLength} caracteres`;
    if (control?.hasError('pattern')) return 'Formato inválido (solo letras minúsculas y guiones bajos)';
    return '';
  }

  hasFieldError(fieldName: string): boolean {
    const control = this.permissionForm.get(fieldName);
    return !!(control?.invalid && control?.touched);
  }

  // Role Management Methods
  loadRoles(): void {
    this.roleService.getAllRoles().subscribe({
      next: (response) => {
        this.roles = response.data;
      },
      error: (error) => {
        console.error('Error loading roles:', error);
      }
    });
  }

  openRolesDialog(permission: Permission): void {
    this.selectedPermission = permission;
    this.showRolesDialog = true;
  }

  closeRolesDialog(): void {
    this.showRolesDialog = false;
    this.selectedPermission = null;
  }

  isRoleAssigned(roleId: number): boolean {
    if (!this.selectedPermission?.assigned_roles) return false;
    return this.selectedPermission.assigned_roles.some((r: AssignedRole) => r.role_id === roleId);
  }

  toggleRole(role: Role): void {
    if (this.savingRoles || !this.selectedPermission) return;

    const isAssigned = this.isRoleAssigned(role.id);
    this.savingRoles = true;

    if (isAssigned) {
      this.removeRoleFromPermission(role);
    } else {
      this.addRoleToPermission(role);
    }
  }

  addRoleToPermission(role: Role): void {
    if (!this.selectedPermission) return;

    this.permissionService.assignPermissionToRole(role.id, this.selectedPermission.id).subscribe({
      next: () => {
        // Actualizar assigned_roles del permiso
        if (!this.selectedPermission!.assigned_roles) {
          this.selectedPermission!.assigned_roles = [];
        }
        this.selectedPermission!.assigned_roles.push({
          role_id: role.id,
          role_name: role.name,
          role_description: role.description
        });
        this.savingRoles = false;
      },
      error: (error) => {
        console.error('Error assigning role:', error);
        alert(error.error?.error || 'Error al asignar el rol');
        this.savingRoles = false;
      }
    });
  }

  removeRoleFromPermission(role: Role): void {
    if (!this.selectedPermission) return;

    this.permissionService.removePermissionFromRole(role.id, this.selectedPermission.id).subscribe({
      next: () => {
        // Remover del array assigned_roles
        if (this.selectedPermission!.assigned_roles) {
          this.selectedPermission!.assigned_roles = this.selectedPermission!.assigned_roles.filter(
            (r: AssignedRole) => r.role_id !== role.id
          );
        }
        this.savingRoles = false;
      },
      error: (error) => {
        console.error('Error removing role:', error);
        alert(error.error?.error || 'Error al remover el rol');
        this.savingRoles = false;
      }
    });
  }

  formatRoleName(name: string): string {
    return name.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  getAssignedRolesCount(): number {
    return this.selectedPermission?.assigned_roles?.length || 0;
  }

  // Form Role Selection Methods
  toggleRoleSelection(roleId: number): void {
    if (this.selectedRolesForNewPermission.has(roleId)) {
      this.selectedRolesForNewPermission.delete(roleId);
    } else {
      this.selectedRolesForNewPermission.add(roleId);
    }
  }

  isRoleSelectedForForm(roleId: number): boolean {
    return this.selectedRolesForNewPermission.has(roleId);
  }

  assignRolesToNewPermission(permissionId: number): void {
    const roleIds = Array.from(this.selectedRolesForNewPermission);
    let completed = 0;
    let hasError = false;

    if (roleIds.length === 0) {
      this.loadPermissions();
      this.closeDialog();
      this.loading = false;
      alert('Permiso creado exitosamente');
      return;
    }

    roleIds.forEach(roleId => {
      this.permissionService.assignPermissionToRole(roleId, permissionId).subscribe({
        next: () => {
          completed++;
          if (completed === roleIds.length) {
            this.loadPermissions();
            this.closeDialog();
            this.loading = false;
            if (hasError) {
              alert('Permiso creado pero hubo errores al asignar algunos roles');
            } else {
              alert(`Permiso creado y asignado a ${roleIds.length} rol(es) exitosamente`);
            }
          }
        },
        error: (error) => {
          console.error('Error assigning role:', error);
          hasError = true;
          completed++;
          if (completed === roleIds.length) {
            this.loadPermissions();
            this.closeDialog();
            this.loading = false;
            alert('Permiso creado pero hubo errores al asignar algunos roles');
          }
        }
      });
    });
  }
}
