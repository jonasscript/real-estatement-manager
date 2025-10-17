import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: number;
  roleName: string;
  is_active: boolean;
  createdAt: string;
  realEstateId?: number;
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
  roleId: number;
  realEstateId?: number;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive?: boolean;
  realEstateId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly API_URL = 'http://localhost:3000/api';

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
    console.error('UserService error:', error);
    return throwError(() => error);
  }

  // Get all users
  getAllUsers(filters?: { role?: string; isActive?: boolean; search?: string }): Observable<{ data: User[]; count: number }> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams();

    if (filters) {
      if (filters.role) params = params.set('role', filters.role);
      if (filters.isActive !== undefined) params = params.set('isActive', filters.isActive.toString());
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.http.get<{ data: User[]; count: number }>(`${this.API_URL}/users`, { headers, params })
      .pipe(catchError(this.handleError));
  }

  // Get user by ID
  getUserById(userId: number): Observable<{ data: User }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: User }>(`${this.API_URL}/users/${userId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Create new user
  createUser(userData: CreateUserData): Observable<{ data: User }> {
    const headers = this.getAuthHeaders();
    return this.http.post<{ data: User }>(`${this.API_URL}/users`, userData, { headers })
      .pipe(catchError(this.handleError));
  }

  // Update user
  updateUser(userId: number, updateData: UpdateUserData): Observable<{ data: User }> {
    const headers = this.getAuthHeaders();
    return this.http.put<{ data: User }>(`${this.API_URL}/users/${userId}`, updateData, { headers })
      .pipe(catchError(this.handleError));
  }

  // Delete user
  deleteUser(userId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.API_URL}/users/${userId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get users by role
  getUsersByRole(roleName: string): Observable<{ data: User[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: User[]; count: number }>(`${this.API_URL}/users/role/${roleName}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get sellers by real estate
  getSellersByRealEstate(realEstateId: number): Observable<{ data: User[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: User[]; count: number }>(`${this.API_URL}/users/real-estate/${realEstateId}/sellers`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get clients by real estate
  getClientsByRealEstate(realEstateId: number): Observable<{ data: User[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: User[]; count: number }>(`${this.API_URL}/users/real-estate/${realEstateId}/clients`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get users by real estate
  getUsersByRealEstate(realEstateId: number): Observable<{ data: User[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: User[]; count: number }>(`${this.API_URL}/users/real-estate/${realEstateId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Assign seller to client
  assignSellerToClient(clientId: number, sellerId: number): Observable<{ data: any }> {
    const headers = this.getAuthHeaders();
    return this.http.put<{ data: any }>(`${this.API_URL}/users/clients/${clientId}/assign-seller`, { sellerId }, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get user statistics
  getUserStatistics(): Observable<{ data: { byRole: any[]; total: number } }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: { byRole: any[]; total: number } }>(`${this.API_URL}/users/statistics`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Change user password
  changePassword(userId: number, password: string): Observable<{ message: string; data: any }> {
    const headers = this.getAuthHeaders();
    return this.http.put<{ message: string; data: any }>(
      `${this.API_URL}/users/${userId}/password`,
      { password },
      { headers }
    ).pipe(catchError(this.handleError));
  }
}

// Role Service Methods
@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private readonly API_URL = 'http://localhost:3000/api';

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
    console.error('RoleService error:', error);
    return throwError(() => error);
  }

  // Get all roles
  getAllRoles(): Observable<{ data: Role[] }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Role[] }>(`${this.API_URL}/roles`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get role by ID
  getRoleById(roleId: number): Observable<{ data: Role }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Role }>(`${this.API_URL}/roles/${roleId}`, { headers })
      .pipe(catchError(this.handleError));
  }
}