import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  private handleError(error: any): Observable<never> {
    console.error('PropertyTypeService error:', error);
    return throwError(() => error);
  }

  // Get all property types
  getAllPropertyTypes(): Observable<PropertyTypeResponse> {
    return this.http.get<PropertyTypeResponse>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  // Get active property types
  getActivePropertyTypes(): Observable<PropertyTypeResponse> {
    return this.http.get<PropertyTypeResponse>(`${this.apiUrl}/active`)
      .pipe(catchError(this.handleError));
  }

  // Get property type by ID
  getPropertyTypeById(id: number): Observable<PropertyTypeResponse> {
    return this.http.get<PropertyTypeResponse>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Create new property type
  createPropertyType(propertyType: Partial<PropertyType>): Observable<PropertyTypeResponse> {
    return this.http.post<PropertyTypeResponse>(this.apiUrl, propertyType)
      .pipe(catchError(this.handleError));
  }

  // Update property type
  updatePropertyType(id: number, propertyType: Partial<PropertyType>): Observable<PropertyTypeResponse> {
    return this.http.put<PropertyTypeResponse>(`${this.apiUrl}/${id}`, propertyType)
      .pipe(catchError(this.handleError));
  }

  // Delete property type
  deletePropertyType(id: number): Observable<PropertyTypeResponse> {
    return this.http.delete<PropertyTypeResponse>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }
}