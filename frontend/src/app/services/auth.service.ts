import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: number;
  real_estate_id?: number | null;
  roleName: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  data: {
    user: User;
    token: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Check if user is logged in on service initialization
    const token = sessionStorage.getItem('token');
    const user = sessionStorage.getItem('user');
    if (token && user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  // Create authenticated HTTP headers
  getAuthHeaders(): { [key: string]: string } {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Login method
  login(credentials: {
    email: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          const { user, token } = response.data;
          // Map real_estate_id from API response to realEstateId for frontend consistency
          const mappedUser = {
            ...user,
            realEstateId: user.real_estate_id || null,
          };
          // Store token and user data in session storage
          sessionStorage.setItem('token', token);
          sessionStorage.setItem('user', JSON.stringify(mappedUser));
          this.currentUserSubject.next(mappedUser);
        }),
        catchError(this.handleError)
      );
  }

  // Logout method
  logout(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('userMenu'); // Clear cached menu
    this.currentUserSubject.next(null);
    this.router.navigate(['/auth/login']);
  }

  // Get current user
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Get JWT token
  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  // Check if user has specific role
  hasRole(role: string): boolean {
    const user = this.currentUser;
    return user ? user.roleName === role : false;
  }

  // Check if user has any of the specified roles
  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUser;
    return user ? roles.includes(user.roleName) : false;
  }

  // Get user profile
  getProfile(): Observable<any> {
    return this.http
      .get(`${this.API_URL}/auth/profile`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  // Update profile
  updateProfile(profileData: any): Observable<any> {
    return this.http
      .put(`${this.API_URL}/auth/profile`, profileData, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap((response) => {
          // Update stored user data
          const currentUser = this.currentUser;
          if (currentUser) {
            const updatedUser = { ...currentUser, ...profileData };
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
            this.currentUserSubject.next(updatedUser);
          }
        }),
        catchError(this.handleError)
      );
  }

  // Verify token
  verifyToken(): Observable<any> {
    return this.http
      .get(`${this.API_URL}/auth/verify-token`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  // Get menu options for current user
  getMenuOptions(): Observable<any> {
    const userData = sessionStorage.getItem('user');
    if (!userData) {
      return throwError(() => new Error('User not authenticated'));
    }

    // If not cached, fetch from backend and store in localStorage
    const user = JSON.parse(userData);
    return this.http
      .get(`${this.API_URL}/menu/role/${user.role_id}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap((response) => {
          // Store menu in localStorage for future use
          localStorage.setItem('userMenu', JSON.stringify(response));
        }),
        catchError(this.handleError)
      );
  }

  // Register new user
  register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
    roleId: number;
  }): Observable<any> {
    return this.http
      .post(`${this.API_URL}/users/register_new`, userData)
      .pipe(catchError(this.handleError));
  }

  // Force refresh menu from backend (useful when permissions change)
  refreshMenuOptions(): Observable<any> {
    const userData = sessionStorage.getItem('user');
    if (!userData) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    // Clear cached menu first
    localStorage.removeItem('userMenu');

    // Fetch fresh menu from backend
    const user = JSON.parse(userData);
    return this.http
      .get(`${this.API_URL}/menu/role/${user.role_id}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap((response) => {
          // Store updated menu in localStorage
          localStorage.setItem('userMenu', JSON.stringify(response));
        }),
        catchError(this.handleError)
      );
  }

  // Error handling
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ocurrió un error desconocido';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      if (error.error && error.error.error) {
        errorMessage = error.error.error;
      } else if (error.status === 401) {
        errorMessage = 'Credenciales inválidas';
      } else if (error.status === 403) {
        errorMessage = 'Acceso denegado';
      } else if (error.status === 500) {
        errorMessage = 'Error del servidor';
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}
