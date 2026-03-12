import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MenuService, MenuOption, RoleMenuOption } from '../../services/menu.service';
import { RoleService, Role } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-role-menu-options',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DialogModule, ButtonModule],
  templateUrl: './role-menu-options.component.html',
  styleUrls: ['./role-menu-options.component.scss']
})
export class RoleMenuOptionsComponent implements OnInit {
  roleMenuOptions: RoleMenuOption[] = [];
  roles: Role[] = [];
  menuOptions: MenuOption[] = [];
  loading = false;
  showAssignDialog = false;
  selectedRole: Role | null = null;
  selectedRoleMenus: MenuOption[] = [];
  availableMenus: MenuOption[] = [];

  assignForm: FormGroup;

  constructor(
    private readonly menuService: MenuService,
    private readonly roleService: RoleService,
    private readonly authService: AuthService,
    private readonly fb: FormBuilder
  ) {
    this.assignForm = this.fb.group({
      roleId: ['', [Validators.required]],
      selectedMenuIds: [[], [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadMenuOptions();
    this.loadRoleMenuOptions();
  }

  loadRoles(): void {
    this.roleService.getAllRoles().subscribe({
      next: (response) => {
        this.roles = response.data;
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        alert('Error al cargar los roles');
      }
    });
  }

  loadMenuOptions(): void {
    this.menuService.getAllMenuOptions().subscribe({
      next: (response) => {
        this.menuOptions = response.data;
      },
      error: (error) => {
        console.error('Error loading menu options:', error);
        alert('Error al cargar las opciones de menú');
      }
    });
  }

  loadRoleMenuOptions(): void {
    this.loading = true;
    this.menuService.getAllRoleMenuOptions().subscribe({
      next: (response) => {
        this.roleMenuOptions = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading role menu options:', error);
        this.loading = false;
        alert('Error al cargar las asignaciones de menú');
      }
    });
  }

  openAssignDialog(role: Role): void {
    this.selectedRole = role;
    this.loading = true;

    // Load current menus for this role
    this.menuService.getMenusByRoleId(role.id).subscribe({
      next: (response) => {
        this.selectedRoleMenus = response.data;
        const selectedMenuIds = this.selectedRoleMenus.map(m => m.id);
        
        this.assignForm.patchValue({
          roleId: role.id,
          selectedMenuIds: selectedMenuIds
        });

        this.loading = false;
        this.showAssignDialog = true;
      },
      error: (error) => {
        console.error('Error loading role menus:', error);
        this.loading = false;
        alert('Error al cargar los menús del rol');
      }
    });
  }

  closeAssignDialog(): void {
    this.showAssignDialog = false;
    this.selectedRole = null;
    this.selectedRoleMenus = [];
    this.assignForm.reset();
  }

  toggleMenuSelection(menuId: number): void {
    const currentSelection = this.assignForm.get('selectedMenuIds')?.value || [];
    const index = currentSelection.indexOf(menuId);
    
    if (index > -1) {
      currentSelection.splice(index, 1);
    } else {
      currentSelection.push(menuId);
    }
    
    this.assignForm.patchValue({ selectedMenuIds: currentSelection });
  }

  isMenuSelected(menuId: number): boolean {
    const currentSelection = this.assignForm.get('selectedMenuIds')?.value || [];
    return currentSelection.includes(menuId);
  }

  updateRoleMenus(): void {
    if (this.assignForm.invalid || !this.selectedRole) {
      return;
    }

    this.loading = true;
    const selectedMenuIds = this.assignForm.get('selectedMenuIds')?.value || [];

    this.menuService.updateRoleMenus(this.selectedRole.id, selectedMenuIds).subscribe({
      next: (response) => {
        console.log('Role menus updated:', response);
        this.authService.notifyMenuRefresh();
        this.loadRoleMenuOptions();
        this.closeAssignDialog();
        alert('Menús del rol actualizados exitosamente');
      },
      error: (error) => {
        console.error('Error updating role menus:', error);
        this.loading = false;
        alert(error.error?.error || 'Error al actualizar los menús del rol');
      }
    });
  }

  getRoleMenuCount(roleId: number): number {
    return this.roleMenuOptions.filter(rm => rm.role_id === roleId).length;
  }

  getMenusByRole(roleName: string): RoleMenuOption[] {
    return this.roleMenuOptions.filter(rm => rm.role_name === roleName);
  }

  removeMenuFromRole(roleMenuOption: RoleMenuOption): void {
    if (!confirm(`¿Estás seguro de que deseas eliminar el menú "${roleMenuOption.menu_label}" del rol "${roleMenuOption.role_name}"?`)) {
      return;
    }

    this.loading = true;
    this.menuService.removeMenuFromRole(roleMenuOption.role_id, roleMenuOption.menu_option_id).subscribe({
      next: (response) => {
        console.log('Menu removed from role:', response);
        this.loadRoleMenuOptions();
        this.authService.notifyMenuRefresh();
        alert('Menú eliminado del rol exitosamente');
      },
      error: (error) => {
        console.error('Error removing menu from role:', error);
        this.loading = false;
        alert(error.error?.error || 'Error al eliminar el menú del rol');
      }
    });
  }

  getTotalAssignments(): number {
    return this.roleMenuOptions.length;
  }

  getUniqueRolesWithMenus(): number {
    const uniqueRoles = new Set(this.roleMenuOptions.map(rm => rm.role_id));
    return uniqueRoles.size;
  }
}
