import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Phase {
  id: number;
  realEstateId: number;
  phaseTypeId: number;
  name: string;
  description?: string;
  status: 'planning' | 'development' | 'selling' | 'completed';
  startDate?: string;
  endDate?: string;
  completionDate?: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  real_estate_name?: string;
  phase_type_name?: string;
}

export interface PhaseSummary {
  id: number;
  name: string;
  description?: string;
  status: string;
  totalBlocks: number;
  totalUnits: number;
  totalProperties: number;
  availableProperties: number;
  soldProperties: number;
  realEstateName: string;
  phaseTypeName: string;
}

export interface PhaseResponse {
  success: boolean;
  message?: string;
  data: Phase | Phase[] | PhaseSummary;
  error?: string;
}

export interface PhaseListResponse {
  success: boolean;
  message?: string;
  data: Phase[];
  error?: string;
}

export interface PhaseSingleResponse {
  success: boolean;
  message?: string;
  data: Phase;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PhaseService {
  private readonly apiUrl = 'http://localhost:3000/api/phases';

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
    console.error('PhaseService error:', error);
    return throwError(() => error);
  }

  // Get all phases
  getAllPhases(realEstateId?: number): Observable<PhaseListResponse> {
    const headers = this.getAuthHeaders();
    const url = realEstateId ? `${this.apiUrl}?realEstateId=${realEstateId}` : this.apiUrl;
    return this.http.get<PhaseListResponse>(url, { headers })
      .pipe(catchError(this.handleError));
  }

  // Alias for getAllPhases
  getAll(realEstateId?: number): Observable<PhaseListResponse> {
    return this.getAllPhases(realEstateId);
  }

  // Get phases by real estate
  getPhasesByRealEstate(realEstateId: number): Observable<PhaseListResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<PhaseListResponse>(`${this.apiUrl}/real-estate/${realEstateId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get phase by ID
  getPhaseById(id: number): Observable<PhaseSingleResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<PhaseSingleResponse>(`${this.apiUrl}/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Create new phase
  createPhase(phase: Partial<Phase>): Observable<PhaseSingleResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<PhaseSingleResponse>(this.apiUrl, phase, { headers })
      .pipe(catchError(this.handleError));
  }

  // Alias for createPhase
  create(phase: Partial<Phase>): Observable<PhaseSingleResponse> {
    return this.createPhase(phase);
  }

  // Create new phase using real estate ID from JWT (no realEstateId in body)
  createPhaseForSelfRealEstate(phase: Omit<Partial<Phase>, 'realEstateId'>): Observable<PhaseSingleResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<PhaseSingleResponse>(`${this.apiUrl}/self-real-estate`, phase, { headers })
      .pipe(catchError(this.handleError));
  }

  // Update phase
  updatePhase(id: number, phase: Partial<Phase>): Observable<PhaseSingleResponse> {
    const headers = this.getAuthHeaders();
    return this.http.put<PhaseSingleResponse>(`${this.apiUrl}/${id}`, phase, { headers })
      .pipe(catchError(this.handleError));
  }

  // Alias for updatePhase
  update(id: number, phase: Partial<Phase>): Observable<PhaseSingleResponse> {
    return this.updatePhase(id, phase);
  }

  // Delete phase
  deletePhase(id: number): Observable<PhaseResponse> {
    const headers = this.getAuthHeaders();
    return this.http.delete<PhaseResponse>(`${this.apiUrl}/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Alias for deletePhase
  delete(id: number): Observable<PhaseResponse> {
    return this.deletePhase(id);
  }
}