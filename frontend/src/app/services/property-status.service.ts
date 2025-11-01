import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface PropertyStatus {
  id: number;
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyStatusResponse {
  success: boolean;
  message?: string;
  data: PropertyStatus | PropertyStatus[];
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PropertyStatusService {
  private readonly apiUrl = 'http://localhost:3000/api/property-status';

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
    console.error('PropertyStatusService error:', error);
    return throwError(() => error);
  }

  // Get all property statuses
  getAllPropertyStatuses(): Observable<PropertyStatusResponse> {
    return this.http.get<PropertyStatusResponse>(this.apiUrl, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Get active property statuses
  getActivePropertyStatuses(): Observable<PropertyStatusResponse> {
    return this.http.get<PropertyStatusResponse>(`${this.apiUrl}/active`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Get property status by ID
  getPropertyStatusById(id: number): Observable<PropertyStatusResponse> {
    return this.http.get<PropertyStatusResponse>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Create new property status
  createPropertyStatus(propertyStatus: Partial<PropertyStatus>): Observable<PropertyStatusResponse> {
    return this.http.post<PropertyStatusResponse>(this.apiUrl, propertyStatus, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Update property status
  updatePropertyStatus(id: number, propertyStatus: Partial<PropertyStatus>): Observable<PropertyStatusResponse> {
    return this.http.put<PropertyStatusResponse>(`${this.apiUrl}/${id}`, propertyStatus, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Delete property status
  deletePropertyStatus(id: number): Observable<PropertyStatusResponse> {
    return this.http.delete<PropertyStatusResponse>(`${this.apiUrl}/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }
}