import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { RoleService, Role } from '../../services/role.service';
import { PermissionService } from '../../services/permission.service';
import { ComponentService, Component as AppComponent } from '../../services/component.service';
import { ActionService, Action as AppAction } from '../../services/action.service';

interface AssignedRole {
  role_id: number;
  role_name: string;
  role_description: string;
}

interface Permission {
  id: number;
  name: string;
  description: string;
  component_id: number;
  component_name?: string;
  action_id: number;
  action?: string;
  created_at: string;
  assigned_roles?: AssignedRole[];
  isAssigned?: boolean;
}

interface GroupedPermissions {
  [componentName: string]: Permission[];
}

@Component({
  selector: 'app-role-permissions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './role-permissions.component.html',
  styleUrls: ['./role-permissions.component.scss']
})
export class RolePermissionsComponent implements OnInit {
  roles: Role[] = [];
  permissions: Permission[] = [];
  components: AppComponent[] = [];
  actions: AppAction[] = [];
  groupedPermissions: GroupedPermissions = {};
  selectedRole: Role | null = null;
  loading = false;
  saving = false;
  showCreateDialog = false;
  showCreateComponentDialog = false;
  showCreateActionDialog = false;
  selectedRolesForNewPermission: Set<number> = new Set();
  permissionForm: FormGroup;
  componentForm: FormGroup;
  actionForm: FormGroup;

  constructor(
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService,
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

    this.componentForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[a-z_]+$/)]],
      description: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]]
    });

    this.actionForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[a-z_]+$/)]],
      description: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(255)]]
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadPermissions();
    this.loadComponents();
    this.loadActions();
  }

  loadRoles(): void {
    this.loading = true;
    this.roleService.getAllRoles().subscribe({
      next: (response) => {
        this.roles = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        this.loading = false;
        alert('Error al cargar los roles');
      }
    });
  }

  loadComponents(): void {
    this.componentService.getAllComponents().subscribe({
      next: (response) => {
        this.components = response.data;
      },
      error: (error) => {
        console.error('Error loading components:', error);
        alert('Error al cargar los componentes');
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
        alert('Error al cargar las acciones');
      }
    });
  }

  loadPermissions(): void {
    this.loading = true;
    this.permissionService.getAllPermissions().subscribe({
      next: (response) => {
        this.permissions = response.data;
        this.groupPermissionsByComponent();
        if (this.selectedRole) {
          this.markAssignedPermissions();
        }
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
    this.groupedPermissions = {};
    this.permissions.forEach(permission => {
      const component = permission.component_name || `Component ${permission.component_id}`;
      if (!this.groupedPermissions[component]) {
        this.groupedPermissions[component] = [];
      }
      this.groupedPermissions[component].push(permission);
    });
  }

  selectRole(role: Role): void {
    this.selectedRole = role;
    this.markAssignedPermissions();
  }

  markAssignedPermissions(): void {
    if (!this.selectedRole) return;

    this.permissions.forEach(permission => {
      permission.isAssigned = permission.assigned_roles?.some(
        role => role.role_id === this.selectedRole!.id
      ) || false;
    });
  }

  togglePermission(permission: Permission): void {
    if (!this.selectedRole || this.saving) return;

    permission.isAssigned = !permission.isAssigned;

    this.saving = true;
    if (permission.isAssigned) {
      this.assignPermission(permission);
    } else {
      this.removePermission(permission);
    }
  }

  assignPermission(permission: Permission): void {
    if (!this.selectedRole) return;

    this.permissionService.assignPermissionToRole(this.selectedRole.id, permission.id).subscribe({
      next: () => {
        this.saving = false;
        // Actualizar assigned_roles del permiso
        if (!permission.assigned_roles) {
          permission.assigned_roles = [];
        }
        permission.assigned_roles.push({
          role_id: this.selectedRole!.id,
          role_name: this.selectedRole!.name,
          role_description: this.selectedRole!.description
        });
      },
      error: (error) => {
        console.error('Error assigning permission:', error);
        permission.isAssigned = false;
        this.saving = false;
        alert(error.error?.error || 'Error al asignar el permiso');
      }
    });
  }

  removePermission(permission: Permission): void {
    if (!this.selectedRole) return;

    this.permissionService.removePermissionFromRole(this.selectedRole.id, permission.id).subscribe({
      next: () => {
        this.saving = false;
        // Actualizar assigned_roles del permiso
        if (permission.assigned_roles) {
          permission.assigned_roles = permission.assigned_roles.filter(
            role => role.role_id !== this.selectedRole!.id
          );
        }
      },
      error: (error) => {
        console.error('Error removing permission:', error);
        permission.isAssigned = true;
        this.saving = false;
        alert(error.error?.error || 'Error al remover el permiso');
      }
    });
  }

  getComponentNames(): string[] {
    return Object.keys(this.groupedPermissions).sort();
  }

  getPermissionsByComponent(componentName: string): Permission[] {
    return this.groupedPermissions[componentName] || [];
  }

  getAssignedPermissionsCount(): number {
    return this.permissions.filter(p => p.isAssigned).length;
  }

  getTotalPermissionsCount(): number {
    return this.permissions.length;
  }

  getActionIcon(action?: string): string {
    const icons: { [key: string]: string } = {
      'view': 'fa-eye',
      'create': 'fa-plus',
      'update': 'fa-edit',
      'delete': 'fa-trash'
    };
    return icons[action || ''] || 'fa-check';
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

  formatRoleName(name: string): string {
    return name.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  // Create Permission Methods
  openCreateDialog(): void {
    this.permissionForm.reset();
    this.selectedRolesForNewPermission.clear();
    this.showCreateDialog = true;
  }

  closeCreateDialog(): void {
    this.showCreateDialog = false;
    this.permissionForm.reset();
    this.selectedRolesForNewPermission.clear();
  }

  toggleRoleSelectionForNewPermission(roleId: number): void {
    if (this.selectedRolesForNewPermission.has(roleId)) {
      this.selectedRolesForNewPermission.delete(roleId);
    } else {
      this.selectedRolesForNewPermission.add(roleId);
    }
  }

  isRoleSelectedForNewPermission(roleId: number): boolean {
    return this.selectedRolesForNewPermission.has(roleId);
  }

  saveNewPermission(): void {
    if (this.permissionForm.invalid) {
      Object.keys(this.permissionForm.controls).forEach(key => {
        this.permissionForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.saving = true;
    const formData = this.permissionForm.value;
    const permissionData = {
      name: formData.name,
      description: formData.description,
      componentId: formData.componentId,
      actionId: formData.actionId
    };

    this.permissionService.createPermission(permissionData).subscribe({
      next: (response) => {
        const newPermission = response.data;
        
        // Asignar roles si hay seleccionados
        if (this.selectedRolesForNewPermission.size > 0) {
          this.assignRolesToNewPermission(newPermission.id);
        } else {
          this.saving = false;
          this.closeCreateDialog();
          this.loadPermissions();
          alert('Permiso creado exitosamente');
        }
      },
      error: (error) => {
        console.error('Error creating permission:', error);
        this.saving = false;
        alert(error.error?.error || 'Error al crear el permiso');
      }
    });
  }

  assignRolesToNewPermission(permissionId: number): void {
    const roleIds = Array.from(this.selectedRolesForNewPermission);
    let completedAssignments = 0;
    let hasError = false;

    roleIds.forEach(roleId => {
      this.permissionService.assignPermissionToRole(roleId, permissionId).subscribe({
        next: () => {
          completedAssignments++;
          if (completedAssignments === roleIds.length) {
            this.saving = false;
            this.closeCreateDialog();
            this.loadPermissions();
            if (!hasError) {
              alert('Permiso creado y asignado exitosamente');
            }
          }
        },
        error: (error) => {
          console.error('Error assigning permission to role:', error);
          hasError = true;
          completedAssignments++;
          if (completedAssignments === roleIds.length) {
            this.saving = false;
            this.closeCreateDialog();
            this.loadPermissions();
            alert('Permiso creado pero hubo errores al asignar algunos roles');
          }
        }
      });
    });
  }
  
  // Component Dialog Methods
  openCreateComponentDialog(): void {
    this.componentForm.reset();
    this.showCreateComponentDialog = true;
  }

  closeCreateComponentDialog(): void {
    this.showCreateComponentDialog = false;
    this.componentForm.reset();
  }

  saveNewComponent(): void {
    if (this.componentForm.invalid) {
      Object.keys(this.componentForm.controls).forEach(key => {
        this.componentForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.saving = true;
    const componentData = this.componentForm.value;

    this.componentService.createComponent(componentData).subscribe({
      next: (response) => {
        this.saving = false;
        this.closeCreateComponentDialog();
        this.loadComponents();
        // Auto-seleccionar el nuevo componente
        this.permissionForm.patchValue({ componentId: response.data.id });
        alert('Componente creado exitosamente');
      },
      error: (error) => {
        console.error('Error creating component:', error);
        this.saving = false;
        alert(error.error?.error || 'Error al crear el componente');
      }
    });
  }

  // Action Dialog Methods
  openCreateActionDialog(): void {
    this.actionForm.reset();
    this.showCreateActionDialog = true;
  }

  closeCreateActionDialog(): void {
    this.showCreateActionDialog = false;
    this.actionForm.reset();
  }

  saveNewAction(): void {
    if (this.actionForm.invalid) {
      Object.keys(this.actionForm.controls).forEach(key => {
        this.actionForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.saving = true;
    const actionData = this.actionForm.value;

    this.actionService.createAction(actionData).subscribe({
      next: (response) => {
        this.saving = false;
        this.closeCreateActionDialog();
        this.loadActions();
        // Auto-seleccionar la nueva acción
        this.permissionForm.patchValue({ actionId: response.data.id });
        alert('Acción creada exitosamente');
      },
      error: (error) => {
        console.error('Error creating action:', error);
        this.saving = false;
        alert(error.error?.error || 'Error al crear la acción');
      }
    });
  }
}
