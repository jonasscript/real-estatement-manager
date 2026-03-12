import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MenuService, MenuOption, CreateMenuData, UpdateMenuData } from '../../services/menu.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-menu-options',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DialogModule, ButtonModule],
  templateUrl: './menu-options.component.html',
  styleUrls: ['./menu-options.component.scss']
})
export class MenuOptionsComponent implements OnInit {
  menuOptions: MenuOption[] = [];
  parentMenuOptions: MenuOption[] = [];
  loading = false;
  showCreateDialog = false;
  editingMenu: MenuOption | null = null;
  showEditDialog = false;

  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private readonly menuService: MenuService,
    private readonly fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      label: ['', [Validators.required, Validators.minLength(2)]],
      path: ['', [Validators.required]],
      icon: ['circle'],
      parentId: [null],
      sortOrder: [0, [Validators.min(0)]],
      isActive: [true]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      label: ['', [Validators.required, Validators.minLength(2)]],
      path: ['', [Validators.required]],
      icon: [''],
      parentId: [null],
      sortOrder: [0, [Validators.min(0)]],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    this.loadMenuOptions();
  }

  loadMenuOptions(): void {
    this.loading = true;
    this.menuService.getAllMenuOptions().subscribe({
      next: (response) => {
        this.menuOptions = response.data;
        this.parentMenuOptions = this.menuOptions.filter(m => !m.parent_id);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading menu options:', error);
        this.loading = false;
        alert('Error al cargar las opciones de menú');
      }
    });
  }

  openCreateDialog(): void {
    this.createForm.reset({
      name: '',
      label: '',
      path: '',
      icon: 'circle',
      parentId: null,
      sortOrder: 0,
      isActive: true
    });
    this.showCreateDialog = true;
  }

  closeCreateDialog(): void {
    this.showCreateDialog = false;
    this.createForm.reset();
  }

  createMenuOption(): void {
    if (this.createForm.invalid) {
      Object.keys(this.createForm.controls).forEach(key => {
        this.createForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    const menuData: CreateMenuData = this.createForm.value;

    this.menuService.createMenuOption(menuData).subscribe({
      next: (response) => {
        console.log('Menu option created:', response);
        this.loadMenuOptions();
        this.closeCreateDialog();
        alert('Opción de menú creada exitosamente');
      },
      error: (error) => {
        console.error('Error creating menu option:', error);
        this.loading = false;
        alert(error.error?.error || 'Error al crear la opción de menú');
      }
    });
  }

  openEditDialog(menu: MenuOption): void {
    this.editingMenu = menu;
    this.editForm.patchValue({
      name: menu.name,
      label: menu.label,
      path: menu.path,
      icon: menu.icon,
      parentId: menu.parent_id,
      sortOrder: menu.sort_order,
      isActive: menu.is_active
    });
    this.showEditDialog = true;
  }

  closeEditDialog(): void {
    this.showEditDialog = false;
    this.editingMenu = null;
    this.editForm.reset();
  }

  updateMenuOption(): void {
    if (this.editForm.invalid || !this.editingMenu) {
      return;
    }

    this.loading = true;
    const updateData: UpdateMenuData = this.editForm.value;

    this.menuService.updateMenuOption(this.editingMenu.id, updateData).subscribe({
      next: (response) => {
        console.log('Menu option updated:', response);
        this.loadMenuOptions();
        this.closeEditDialog();
        alert('Opción de menú actualizada exitosamente');
      },
      error: (error) => {
        console.error('Error updating menu option:', error);
        this.loading = false;
        alert(error.error?.error || 'Error al actualizar la opción de menú');
      }
    });
  }

  deleteMenuOption(menu: MenuOption): void {
    if (!confirm(`¿Estás seguro de que deseas eliminar la opción de menú "${menu.label}"?`)) {
      return;
    }

    this.loading = true;
    this.menuService.deleteMenuOption(menu.id).subscribe({
      next: (response) => {
        console.log('Menu option deleted:', response);
        this.loadMenuOptions();
        alert('Opción de menú eliminada exitosamente');
      },
      error: (error) => {
        console.error('Error deleting menu option:', error);
        this.loading = false;
        alert(error.error?.error || 'Error al eliminar la opción de menú');
      }
    });
  }

  getActiveMenusCount(): number {
    return this.menuOptions.filter(m => m.is_active).length;
  }

  getInactiveMenusCount(): number {
    return this.menuOptions.filter(m => !m.is_active).length;
  }

  getParentMenuLabel(parentId?: number): string {
    if (!parentId) return 'Sin padre';
    const parent = this.menuOptions.find(m => m.id === parentId);
    return parent ? parent.label : 'Desconocido';
  }
}
