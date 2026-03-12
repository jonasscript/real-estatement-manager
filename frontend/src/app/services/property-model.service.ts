import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface PropertyModel {
  id: number;
  name: string;
  description?: string;
  propertyTypeId: number;
  area_sqm?: number;
  bedrooms?: number;
  bathrooms?: number;
  floorPlanUrl?: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  propertyTypeName?: string;
  phaseName?: string;
}

export interface PropertyModelResponse {
  success: boolean;
  message?: string;
  data: PropertyModel | PropertyModel[];
  error?: string;
}

export interface PropertyModelListResponse {
  success: boolean;
  message?: string;
  data: PropertyModel[];
  error?: string;
}

export interface PropertyModelSingleResponse {
  success: boolean;
  message?: string;
  data: PropertyModel;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PropertyModelService {
  private readonly apiUrl = 'http://localhost:3000/api/property-models';

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  private handleError(error: any): Observable<never> {
    console.error('PropertyModelService error:', error);
    return throwError(() => error);
  }

  // Get all property models
  getAll(): Observable<PropertyModelListResponse> {
    return this.http.get<PropertyModelListResponse>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  // Get active property models
  getActive(): Observable<PropertyModelListResponse> {
    return this.http.get<PropertyModelListResponse>(`${this.apiUrl}/active`)
      .pipe(catchError(this.handleError));
  }

  // Get property model by ID
  getById(id: number): Observable<PropertyModelSingleResponse> {
    return this.http.get<PropertyModelSingleResponse>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Get property models by property type
  getByPropertyType(propertyTypeId: number): Observable<PropertyModelListResponse> {
    return this.http.get<PropertyModelListResponse>(`${this.apiUrl}/property-type/${propertyTypeId}`)
      .pipe(catchError(this.handleError));
  }

  // Get property models by phase
  getByPhase(phaseId: number): Observable<PropertyModelListResponse> {
    return this.http.get<PropertyModelListResponse>(`${this.apiUrl}/phase/${phaseId}`)
      .pipe(catchError(this.handleError));
  }

  // Create new property model
  create(propertyModel: Partial<PropertyModel>): Observable<PropertyModelSingleResponse> {
    return this.http.post<PropertyModelSingleResponse>(this.apiUrl, propertyModel)
      .pipe(catchError(this.handleError));
  }

  // Update property model
  update(id: number, propertyModel: Partial<PropertyModel>): Observable<PropertyModelSingleResponse> {
    return this.http.put<PropertyModelSingleResponse>(`${this.apiUrl}/${id}`, propertyModel)
      .pipe(catchError(this.handleError));
  }

  // Delete property model
  delete(id: number): Observable<PropertyModelResponse> {
    return this.http.delete<PropertyModelResponse>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Activate/Deactivate property model
  toggleStatus(id: number): Observable<PropertyModelResponse> {
    return this.http.patch<PropertyModelResponse>(`${this.apiUrl}/${id}/toggle-status`, {})
      .pipe(catchError(this.handleError));
  }
}