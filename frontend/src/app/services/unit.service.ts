import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Unit {
  id: number;
  unit_number: string;
  block_id: number;
  property_model_id: number;
  property_status_id: number;
  floor?: number;
  area?: number;
  price?: number;
  description?: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  block_name?: string;
  property_model_name?: string;
  property_status_name?: string;
  property_status_color?: string;
  phase_name?: string;
  real_estate_name?: string;
  status_name?: string;
}

export interface UnitSummary {
  id: number;
  unitNumber: string;
  blockName: string;
  propertyModelName: string;
  propertyStatusName: string;
  floor: number;
  area: number;
  price: number;
  isAvailable: boolean;
  phaseName: string;
  realEstateName: string;
}

export interface UnitStats {
  totalUnits: number;
  availableUnits: number;
  soldUnits: number;
  reservedUnits: number;
  averagePrice: number;
  totalArea: number;
  averageArea: number;
  unitsByStatus: Array<{
    statusName: string;
    statusColor: string;
    count: number;
    percentage: number;
  }>;
  unitsByBlock: Array<{
    blockName: string;
    count: number;
    percentage: number;
  }>;
}

export interface UnitResponse {
  success: boolean;
  message?: string;
  data: Unit | Unit[] | UnitSummary | UnitStats;
  error?: string;
}

export interface UnitListResponse {
  success: boolean;
  message?: string;
  data: Unit[];
  error?: string;
}

export interface UnitSingleResponse {
  success: boolean;
  message?: string;
  data: Unit;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UnitService {
  private readonly apiUrl = 'http://localhost:3000/api/units';

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
    console.error('UnitService error:', error);
    return throwError(() => error);
  }

  // Get all units
  getAll(): Observable<UnitListResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<UnitListResponse>(this.apiUrl, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get available units
  getAvailable(): Observable<UnitListResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<UnitListResponse>(`${this.apiUrl}/available`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get unit by ID
  getById(id: number): Observable<UnitSingleResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<UnitSingleResponse>(`${this.apiUrl}/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get units by block
  getByBlock(blockId: number): Observable<UnitListResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<UnitListResponse>(`${this.apiUrl}/block/${blockId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get units by property model
  getByPropertyModel(propertyModelId: number): Observable<UnitListResponse> {
    return this.http.get<UnitListResponse>(`${this.apiUrl}/property-model/${propertyModelId}`);
  }

  // Get units by property status
  getByPropertyStatus(propertyStatusId: number): Observable<UnitListResponse> {
    return this.http.get<UnitListResponse>(`${this.apiUrl}/property-status/${propertyStatusId}`);
  }

  // Get units by phase
  getByPhase(phaseId: number): Observable<UnitListResponse> {
    return this.http.get<UnitListResponse>(`${this.apiUrl}/phase/${phaseId}`);
  }

  // Get units by floor
  getByFloor(blockId: number, floor: number): Observable<UnitListResponse> {
    return this.http.get<UnitListResponse>(`${this.apiUrl}/block/${blockId}/floor/${floor}`);
  }

  // Get unit statistics
  getStats(): Observable<UnitResponse> {
    return this.http.get<UnitResponse>(`${this.apiUrl}/stats`);
  }

  // Get unit statistics by block
  getStatsByBlock(blockId: number): Observable<UnitResponse> {
    return this.http.get<UnitResponse>(`${this.apiUrl}/block/${blockId}/stats`);
  }

  // Get unit statistics by phase
  getStatsByPhase(phaseId: number): Observable<UnitResponse> {
    return this.http.get<UnitResponse>(`${this.apiUrl}/phase/${phaseId}/stats`);
  }

  // Search units
  search(filters: {
    search?: string;
    blockId?: number;
    propertyModelId?: number;
    propertyStatusId?: number;
    isAvailable?: boolean;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
    floor?: number;
  }): Observable<UnitListResponse> {
    const params = new URLSearchParams();
    
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    }

    return this.http.get<UnitListResponse>(`${this.apiUrl}/search?${params.toString()}`);
  }

  // Create new unit
  create(unit: Partial<Unit>): Observable<UnitSingleResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<UnitSingleResponse>(this.apiUrl, unit, { headers })
      .pipe(catchError(this.handleError));
  }

  // Update unit
  update(id: number, unit: Partial<Unit>): Observable<UnitSingleResponse> {
    const headers = this.getAuthHeaders();
    return this.http.put<UnitSingleResponse>(`${this.apiUrl}/${id}`, unit, { headers })
      .pipe(catchError(this.handleError));
  }

  // Delete unit
  delete(id: number): Observable<UnitResponse> {
    const headers = this.getAuthHeaders();
    return this.http.delete<UnitResponse>(`${this.apiUrl}/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Update unit availability
  updateAvailability(id: number, isAvailable: boolean): Observable<UnitResponse> {
    return this.http.patch<UnitResponse>(`${this.apiUrl}/${id}/availability`, { isAvailable });
  }

  // Update unit price
  updatePrice(id: number, price: number): Observable<UnitResponse> {
    return this.http.patch<UnitResponse>(`${this.apiUrl}/${id}/price`, { price });
  }

  // Update unit status
  updateStatus(id: number, propertyStatusId: number): Observable<UnitResponse> {
    return this.http.patch<UnitResponse>(`${this.apiUrl}/${id}/status`, { propertyStatusId });
  }

  // Bulk update units
  bulkUpdate(unitIds: number[], updates: Partial<Unit>): Observable<UnitResponse> {
    return this.http.patch<UnitResponse>(`${this.apiUrl}/bulk-update`, { unitIds, updates });
  }

  // Validate unit number uniqueness within block
  validateUnitNumber(blockId: number, unitNumber: string, excludeUnitId?: number): Observable<UnitResponse> {
    const params = new URLSearchParams();
    params.append('blockId', blockId.toString());
    params.append('unitNumber', unitNumber);
    if (excludeUnitId) {
      params.append('excludeUnitId', excludeUnitId.toString());
    }
    
    return this.http.get<UnitResponse>(`${this.apiUrl}/validate-unit-number?${params.toString()}`);
  }
}