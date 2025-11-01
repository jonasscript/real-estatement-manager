import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface PropertyType {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyTypeResponse {
  success: boolean;
  message?: string;
  data: PropertyType | PropertyType[];
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PropertyTypeService {
  private readonly apiUrl = 'http://localhost:3000/api/property-types';

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
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
    console.error('PropertyTypeService error:', error);
    return throwError(() => error);
  }

  // Get all property types
  getAllPropertyTypes(): Observable<PropertyTypeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<PropertyTypeResponse>(this.apiUrl, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get active property types
  getActivePropertyTypes(): Observable<PropertyTypeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<PropertyTypeResponse>(`${this.apiUrl}/active`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get property type by ID
  getPropertyTypeById(id: number): Observable<PropertyTypeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<PropertyTypeResponse>(`${this.apiUrl}/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Create new property type
  createPropertyType(propertyType: Partial<PropertyType>): Observable<PropertyTypeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<PropertyTypeResponse>(this.apiUrl, propertyType, { headers })
      .pipe(catchError(this.handleError));
  }

  // Update property type
  updatePropertyType(id: number, propertyType: Partial<PropertyType>): Observable<PropertyTypeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.put<PropertyTypeResponse>(`${this.apiUrl}/${id}`, propertyType, { headers })
      .pipe(catchError(this.handleError));
  }

  // Delete property type
  deletePropertyType(id: number): Observable<PropertyTypeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.delete<PropertyTypeResponse>(`${this.apiUrl}/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }
}