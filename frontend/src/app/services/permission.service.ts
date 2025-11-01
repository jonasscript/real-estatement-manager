import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Permission {
  id: number;
  name: string;
  description: string;
  component_name: string;
  action: string;
  created_at: string;
}

export interface PermissionCheck {
  hasPermission: boolean;
  roleId: number;
  componentName: string;
  action: string;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private readonly API_URL = '/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: any): Observable<never> {
    console.error('PermissionService error:', error);
    return throwError(() => error);
  }

  // Get all permissions
  getAllPermissions(): Observable<{ data: Permission[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Permission[]; count: number }>(`${this.API_URL}/permissions`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get permissions by role
  getPermissionsByRole(roleId: number): Observable<{ data: Permission[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Permission[]; count: number }>(`${this.API_URL}/permissions/role/${roleId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get permissions by component and role
  getPermissionsByComponentAndRole(componentName: string, roleId: number): Observable<{ data: Permission[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Permission[]; count: number }>(`${this.API_URL}/permissions/component/${componentName}/role/${roleId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Check if user has permission
  checkPermission(roleId: number, componentName: string, action: string): Observable<{ data: PermissionCheck }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: PermissionCheck }>(`${this.API_URL}/permissions/check/${roleId}/${componentName}/${action}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get all permissions for current user (load once and cache)
  private userPermissions: Permission[] | null = null;

  loadUserPermissions(): Observable<Permission[]> {

    const currentUser = this.authService.currentUser;
    if (!currentUser || !currentUser.role_id) {
      return throwError(() => new Error('No user or role information available'));
    }

    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Permission[]; count: number }>(`${this.API_URL}/permissions/role/${currentUser.role_id!}`, { headers })
      .pipe(
        map(response => {
          this.userPermissions = response.data;
          return this.userPermissions;
        }),
        catchError(this.handleError)
      );
  }

  // Check if current user has permission (convenience method using cached permissions)
  hasPermission(componentName: string, action: string): Observable<boolean> {
    return new Observable<boolean>((observer) => {
      if (this.userPermissions) {
        const hasPermission = this.userPermissions.some(
          p => p.component_name === componentName && p.action === action
        );
        observer.next(hasPermission);
        observer.complete();
      } else {
        this.loadUserPermissions().subscribe({
          next: (permissions) => {
            const hasPermission = permissions.some(
              p => p.component_name === componentName && p.action === action
            );
            observer.next(hasPermission);
            observer.complete();
          },
          error: (error) => {
            observer.error(error);
          }
        });
      }
    });
  }

  // Clear cached permissions (useful when user role changes)
  clearCache(): void {
    this.userPermissions = null;
  }

  // Get permission by ID
  getPermissionById(permissionId: number): Observable<{ data: Permission }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Permission }>(`${this.API_URL}/permissions/${permissionId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Create new permission (admin only)
  createPermission(permissionData: Omit<Permission, 'id' | 'created_at'>): Observable<{ data: Permission }> {
    const headers = this.getAuthHeaders();
    return this.http.post<{ data: Permission }>(`${this.API_URL}/permissions`, permissionData, { headers })
      .pipe(catchError(this.handleError));
  }

  // Update permission (admin only)
  updatePermission(permissionId: number, updateData: Partial<Omit<Permission, 'id' | 'created_at'>>): Observable<{ data: Permission }> {
    const headers = this.getAuthHeaders();
    return this.http.put<{ data: Permission }>(`${this.API_URL}/permissions/${permissionId}`, updateData, { headers })
      .pipe(catchError(this.handleError));
  }

  // Delete permission (admin only)
  deletePermission(permissionId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.API_URL}/permissions/${permissionId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Assign permission to role (admin only)
  assignPermissionToRole(roleId: number, permissionId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.API_URL}/permissions/assign/${roleId}/${permissionId}`, {}, { headers })
      .pipe(catchError(this.handleError));
  }

  // Remove permission from role (admin only)
  removePermissionFromRole(roleId: number, permissionId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.API_URL}/permissions/assign/${roleId}/${permissionId}`, { headers })
      .pipe(catchError(this.handleError));
  }
}