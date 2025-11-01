import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface PhaseType {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PhaseTypeResponse {
  success: boolean;
  message?: string;
  data: PhaseType | PhaseType[];
  error?: string;
}

export interface PhaseTypeListResponse {
  success: boolean;
  message?: string;
  data: PhaseType[];
  error?: string;
}

export interface PhaseTypeSingleResponse {
  success: boolean;
  message?: string;
  data: PhaseType;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PhaseTypeService {
  private readonly apiUrl = 'http://localhost:3000/api/phase-types';

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
    console.error('PhaseTypeService error:', error);
    return throwError(() => error);
  }

  // Get all phase types
  getAllPhaseTypes(): Observable<PhaseTypeListResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<PhaseTypeListResponse>(this.apiUrl, { headers })
      .pipe(catchError(this.handleError));
  }

  // Alias for getAllPhaseTypes
  getAll(): Observable<PhaseTypeListResponse> {
    return this.getAllPhaseTypes();
  }

  // Get active phase types
  getActivePhaseTypes(): Observable<PhaseTypeListResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<PhaseTypeListResponse>(`${this.apiUrl}/active`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get phase type by ID
  getPhaseTypeById(id: number): Observable<PhaseTypeSingleResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<PhaseTypeSingleResponse>(`${this.apiUrl}/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Create new phase type
  createPhaseType(phaseType: Partial<PhaseType>): Observable<PhaseTypeSingleResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<PhaseTypeSingleResponse>(this.apiUrl, phaseType, { headers })
      .pipe(catchError(this.handleError));
  }

  // Alias for createPhaseType
  create(phaseType: Partial<PhaseType>): Observable<PhaseTypeSingleResponse> {
    return this.createPhaseType(phaseType);
  }

  // Update phase type
  updatePhaseType(id: number, phaseType: Partial<PhaseType>): Observable<PhaseTypeSingleResponse> {
    const headers = this.getAuthHeaders();
    return this.http.put<PhaseTypeSingleResponse>(`${this.apiUrl}/${id}`, phaseType, { headers })
      .pipe(catchError(this.handleError));
  }

  // Alias for updatePhaseType
  update(id: number, phaseType: Partial<PhaseType>): Observable<PhaseTypeSingleResponse> {
    return this.updatePhaseType(id, phaseType);
  }

  // Delete phase type
  deletePhaseType(id: number): Observable<PhaseTypeResponse> {
    const headers = this.getAuthHeaders();
    return this.http.delete<PhaseTypeResponse>(`${this.apiUrl}/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Alias for deletePhaseType
  delete(id: number): Observable<PhaseTypeResponse> {
    return this.deletePhaseType(id);
  }
}