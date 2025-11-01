import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Role {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly API_URL = '/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    if (!token) {
      throw new Error('No se encontró token de autenticación');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: any): Observable<never> {
    console.error('RoleService error:', error);
    return throwError(() => error);
  }

  // Get all roles
  getAllRoles(): Observable<{ data: Role[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Role[]; count: number }>(`${this.API_URL}/roles`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get roles for registration (public endpoint)
  getRolesForRegistration(): Observable<{ data: Role[]; count: number }> {
    return this.http.get<{ data: Role[]; count: number }>(`${this.API_URL}/roles/registration`)
      .pipe(catchError(this.handleError));
  }

  // Get role by ID (admin only)
  getRoleById(roleId: number): Observable<{ data: Role }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Role }>(`${this.API_URL}/roles/${roleId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Create new role (admin only)
  createRole(roleData: { name: string; description: string }): Observable<{ data: Role }> {
    const headers = this.getAuthHeaders();
    return this.http.post<{ data: Role }>(`${this.API_URL}/roles`, roleData, { headers })
      .pipe(catchError(this.handleError));
  }

  // Update role (admin only)
  updateRole(roleId: number, updateData: Partial<{ name: string; description: string }>): Observable<{ data: Role }> {
    const headers = this.getAuthHeaders();
    return this.http.put<{ data: Role }>(`${this.API_URL}/roles/${roleId}`, updateData, { headers })
      .pipe(catchError(this.handleError));
  }

  // Delete role (admin only)
  deleteRole(roleId: number): Observable<{ data: Role }> {
    const headers = this.getAuthHeaders();
    return this.http.delete<{ data: Role }>(`${this.API_URL}/roles/${roleId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get role statistics (admin only)
  getRoleStatistics(): Observable<{ data: any[] }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: any[] }>(`${this.API_URL}/roles/statistics/all`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Helper method to get role display name
  getRoleDisplayName(roleName: string): string {
    const roleDisplayNames: { [key: string]: string } = {
      'system_admin': 'Administrador del Sistema',
      'real_estate_admin': 'Administrador Inmobiliario',
      'seller': 'Vendedor Inmobiliario',
      'client': 'Cliente de Propiedades'
    };
    return roleDisplayNames[roleName] || roleName;
  }

  // Helper method to get role icon
  getRoleIcon(roleName: string): string {
    const roleIcons: { [key: string]: string } = {
      'system_admin': 'fas fa-crown',
      'real_estate_admin': 'fas fa-building',
      'seller': 'fas fa-user-tie',
      'client': 'fas fa-user'
    };
    return roleIcons[roleName] || 'fas fa-user';
  }
}