import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role_id: number;
  role_name: string;           // Cambiado de roleName a role_name para coincidir con backend
  roleDescription: string;    // Cambiado de roledescription a role_description para coincidir con backend
  is_active: boolean;
  created_at: string;
  real_estate_id?: number;     // Cambiado de realEstateId a real_estate_id para coincidir con backend
  real_estate_name?: string;   // Agregado para el nombre de la inmobiliaria
  property_id?: number;
  property_title?: string;
  total_down_payment?: number;
  remaining_balance?: number;
}

export interface Role {
  id: number;
  name: string;
  description: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId?: number; // Opcional para createSellerUser
  realEstateId?: number;  // Mantenemos camelCase para datos enviados al backend
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
  realEstateId?: number;  // Mantenemos camelCase para datos enviados al backend
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  private handleError(error: any): Observable<never> {
    console.error('UserService error:', error);
    return throwError(() => error);
  }

  // Get all users
  getAllUsers(filters?: { role?: string; isActive?: boolean; search?: string }): Observable<{ data: User[]; count: number }> {
    let params = new HttpParams();

    if (filters) {
      if (filters.role) params = params.set('role', filters.role);
      if (filters.isActive !== undefined) params = params.set('isActive', filters.isActive.toString());
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.http.get<{ data: User[]; count: number }>(`${this.API_URL}/users`, { params })
      .pipe(catchError(this.handleError));
  }

  // Get users by role ID (filtered by permissions)
  getUsersByRoleId(roleId: number): Observable<{ data: User[]; count: number }> {
    return this.http.get<{ data: User[]; count: number }>(`${this.API_URL}/users/getAllUsersFromRolId/${roleId}`)
      .pipe(catchError(this.handleError));
  }

  // Get user by ID
  getUserById(userId: number): Observable<{ data: User }> {
    return this.http.get<{ data: User }>(`${this.API_URL}/users/${userId}`)
      .pipe(catchError(this.handleError));
  }

  // Create new user
  createUser(userData: CreateUserData): Observable<{ data: User }> {
    return this.http.post<{ data: User }>(`${this.API_URL}/users`, userData)
      .pipe(catchError(this.handleError));
  }

  // Update user
  updateUser(userId: number, updateData: UpdateUserData): Observable<{ data: User }> {
    return this.http.put<{ data: User }>(`${this.API_URL}/users/${userId}`, updateData)
      .pipe(catchError(this.handleError));
  }

  // Delete user
  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/users/${userId}`)
      .pipe(catchError(this.handleError));
  }

  // Get users by role
  getUsersByRole(roleName: string): Observable<{ data: User[]; count: number }> {
    return this.http.get<{ data: User[]; count: number }>(`${this.API_URL}/users/role/${roleName}`)
      .pipe(catchError(this.handleError));
  }

  // Get sellers by real estate
  getSellersByRealEstate(realEstateId: number): Observable<{ data: User[]; count: number }> {
    return this.http.get<{ data: User[]; count: number }>(`${this.API_URL}/users/real-estate/${realEstateId}/sellers`)
      .pipe(catchError(this.handleError));
  }

  // Get clients by real estate
  getClientsByRealEstate(realEstateId: number): Observable<{ data: User[]; count: number }> {
    return this.http.get<{ data: User[]; count: number }>(`${this.API_URL}/users/real-estate/${realEstateId}/clients`)
      .pipe(catchError(this.handleError));
  }

  // Get users by real estate
  getUsersByRealEstate(realEstateId: number): Observable<{ data: User[]; count: number }> {
    return this.http.get<{ data: User[]; count: number }>(`${this.API_URL}/users/real-estate/${realEstateId}`)
      .pipe(catchError(this.handleError));
  }

  // Assign seller to client
  assignSellerToClient(clientId: number, sellerId: number): Observable<{ data: any }> {
    return this.http.put<{ data: any }>(`${this.API_URL}/users/clients/${clientId}/assign-seller`, { sellerId })
      .pipe(catchError(this.handleError));
  }

  // Get user statistics
  getUserStatistics(): Observable<{ data: { byRole: any[]; total: number } }> {
    return this.http.get<{ data: { byRole: any[]; total: number } }>(`${this.API_URL}/users/statistics`)
      .pipe(catchError(this.handleError));
  }

  // Change user password
  changePassword(userId: number, password: string): Observable<{ message: string; data: any }> {
    return this.http.put<{ message: string; data: any }>(
      `${this.API_URL}/users/${userId}/password`,
      { password }
    ).pipe(catchError(this.handleError));
  }

  // Create seller user (creates both user and seller records)
  createSellerUser(userData: CreateUserData): Observable<{ data: any }> {
    return this.http.post<{ data: any }>(`${this.API_URL}/users/create-seller`, userData)
      .pipe(catchError(this.handleError));
  }
}

// Role Service Methods
@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  private handleError(error: any): Observable<never> {
    console.error('RoleService error:', error);
    return throwError(() => error);
  }

  // Get all roles
  getAllRoles(): Observable<{ data: Role[] }> {
    return this.http.get<{ data: Role[] }>(`${this.API_URL}/roles`)
      .pipe(catchError(this.handleError));
  }

  // Get admin roles (real_estate_admin and seller)
  getAdminRoles(): Observable<{ data: Role[] }> {
    return this.http.get<{ data: Role[] }>(`${this.API_URL}/roles/admin`)
      .pipe(catchError(this.handleError));
  }

  // Get role by ID
  getRoleById(roleId: number): Observable<{ data: Role }> {
    return this.http.get<{ data: Role }>(`${this.API_URL}/roles/${roleId}`)
      .pipe(catchError(this.handleError));
  }
}