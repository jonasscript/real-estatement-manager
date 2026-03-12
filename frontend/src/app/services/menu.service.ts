import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MenuOption {
  id: number;
  name: string;
  label: string;
  path: string;
  icon: string;
  parent_id?: number;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  children?: MenuOption[];
}

export interface RoleMenuOption {
  id: number;
  role_id: number;
  role_name: string;
  role_description: string;
  menu_option_id: number;
  menu_name: string;
  menu_label: string;
  menu_path: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface CreateMenuData {
  name: string;
  label: string;
  path: string;
  icon?: string;
  parentId?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateMenuData {
  name?: string;
  label?: string;
  path?: string;
  icon?: string;
  parentId?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface ApiResponse<T> {
  message: string;
  data: T;
  count?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private readonly http: HttpClient) {}

  // Get all menu options (admin only)
  getAllMenuOptions(): Observable<ApiResponse<MenuOption[]>> {
    return this.http.get<ApiResponse<MenuOption[]>>(`${this.API_URL}/menu/all`);
  }

  // Get menu option by ID
  getMenuOptionById(id: number): Observable<ApiResponse<MenuOption>> {
    return this.http.get<ApiResponse<MenuOption>>(`${this.API_URL}/menu/${id}`);
  }

  // Get menu hierarchy
  getMenuHierarchy(): Observable<ApiResponse<MenuOption[]>> {
    return this.http.get<ApiResponse<MenuOption[]>>(`${this.API_URL}/menu/hierarchy/all`);
  }

  // Create menu option
  createMenuOption(menuData: CreateMenuData): Observable<ApiResponse<MenuOption>> {
    return this.http.post<ApiResponse<MenuOption>>(`${this.API_URL}/menu`, menuData);
  }

  // Update menu option
  updateMenuOption(id: number, menuData: UpdateMenuData): Observable<ApiResponse<MenuOption>> {
    return this.http.put<ApiResponse<MenuOption>>(`${this.API_URL}/menu/${id}`, menuData);
  }

  // Delete menu option
  deleteMenuOption(id: number): Observable<ApiResponse<MenuOption>> {
    return this.http.delete<ApiResponse<MenuOption>>(`${this.API_URL}/menu/${id}`);
  }

  // Get all role-menu assignments
  getAllRoleMenuOptions(): Observable<ApiResponse<RoleMenuOption[]>> {
    return this.http.get<ApiResponse<RoleMenuOption[]>>(`${this.API_URL}/menu/role-menu-options/all`);
  }

  // Get menus by role ID
  getMenusByRoleId(roleId: number): Observable<ApiResponse<MenuOption[]>> {
    return this.http.get<ApiResponse<MenuOption[]>>(`${this.API_URL}/menu/by-role/${roleId}`);
  }

  // Assign menu to role
  assignMenuToRole(roleId: number, menuOptionId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API_URL}/menu/assign/${roleId}/${menuOptionId}`, {});
  }

  // Remove menu from role
  removeMenuFromRole(roleId: number, menuOptionId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.API_URL}/menu/assign/${roleId}/${menuOptionId}`);
  }

  // Bulk update role menus
  updateRoleMenus(roleId: number, menuOptionIds: number[]): Observable<ApiResponse<MenuOption[]>> {
    return this.http.put<ApiResponse<MenuOption[]>>(`${this.API_URL}/menu/role/${roleId}/menus`, { menuOptionIds });
  }
}
