import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Block {
  id: number;
  name: string;
  phase_id: number;
  total_units: number;
  occupied_units: number;
  available_units: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  phase_name?: string;
  real_estate_name?: string;
  occupancy_rate?: number;
}

export interface BlockSummary {
  id: number;
  name: string;
  phaseName: string;
  realEstateName: string;
  totalUnits: number;
  occupiedUnits: number;
  availableUnits: number;
  occupancyRate: number;
  isActive: boolean;
}

export interface BlockStats {
  totalBlocks: number;
  activeBlocks: number;
  inactiveBlocks: number;
  totalUnits: number;
  totalOccupiedUnits: number;
  totalAvailableUnits: number;
  averageOccupancyRate: number;
  blocksByPhase: Array<{
    phaseName: string;
    phaseId: number;
    blockCount: number;
    unitCount: number;
    occupancyRate: number;
  }>;
  occupancyDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

export interface BlockResponse {
  success: boolean;
  message?: string;
  data: Block | Block[] | BlockSummary | BlockStats;
  error?: string;
}

export interface BlockListResponse {
  success: boolean;
  message?: string;
  data: Block[];
  error?: string;
}

export interface BlockSingleResponse {
  success: boolean;
  message?: string;
  data: Block;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BlockService {
  private readonly apiUrl = 'http://localhost:3000/api/blocks';

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
    console.error('BlockService error:', error);
    return throwError(() => error);
  }

  // Get all blocks
  getAll(): Observable<BlockListResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<BlockListResponse>(this.apiUrl, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get active blocks
  getActive(): Observable<BlockListResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<BlockListResponse>(`${this.apiUrl}/active`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get block by ID
  getById(id: number): Observable<BlockSingleResponse> {
    const headers = this.getAuthHeaders();
    return this.http.get<BlockSingleResponse>(`${this.apiUrl}/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get blocks by phase
  getByPhase(phaseId: number): Observable<BlockListResponse> {
    return this.http.get<BlockListResponse>(`${this.apiUrl}/phase/${phaseId}`);
  }

  // Get blocks by real estate
  getByRealEstate(realEstateId: number): Observable<BlockListResponse> {
    return this.http.get<BlockListResponse>(`${this.apiUrl}/real-estate/${realEstateId}`);
  }

  // Get blocks with availability
  getWithAvailability(): Observable<BlockListResponse> {
    return this.http.get<BlockListResponse>(`${this.apiUrl}/with-availability`);
  }

  // Get block statistics
  getStats(): Observable<BlockResponse> {
    return this.http.get<BlockResponse>(`${this.apiUrl}/stats`);
  }

  // Get block statistics by phase
  getStatsByPhase(phaseId: number): Observable<BlockResponse> {
    return this.http.get<BlockResponse>(`${this.apiUrl}/phase/${phaseId}/stats`);
  }

  // Get block statistics by real estate
  getStatsByRealEstate(realEstateId: number): Observable<BlockResponse> {
    return this.http.get<BlockResponse>(`${this.apiUrl}/real-estate/${realEstateId}/stats`);
  }

  // Search blocks
  search(filters: {
    search?: string;
    phaseId?: number;
    realEstateId?: number;
    isActive?: boolean;
    minOccupancyRate?: number;
    maxOccupancyRate?: number;
    hasAvailableUnits?: boolean;
  }): Observable<BlockListResponse> {
    const params = new URLSearchParams();
    
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    }

    return this.http.get<BlockListResponse>(`${this.apiUrl}/search?${params.toString()}`);
  }

  // Create new block
  create(block: Partial<Block>): Observable<BlockSingleResponse> {
    const headers = this.getAuthHeaders();
    return this.http.post<BlockSingleResponse>(this.apiUrl, block, { headers })
      .pipe(catchError(this.handleError));
  }

  // Update block
  update(id: number, block: Partial<Block>): Observable<BlockSingleResponse> {
    const headers = this.getAuthHeaders();
    return this.http.put<BlockSingleResponse>(`${this.apiUrl}/${id}`, block, { headers })
      .pipe(catchError(this.handleError));
  }

  // Delete block
  delete(id: number): Observable<BlockResponse> {
    const headers = this.getAuthHeaders();
    return this.http.delete<BlockResponse>(`${this.apiUrl}/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Update block status
  updateStatus(id: number, isActive: boolean): Observable<BlockResponse> {
    return this.http.patch<BlockResponse>(`${this.apiUrl}/${id}/status`, { isActive });
  }

  // Update unit counts
  updateUnitCounts(id: number, totalUnits: number): Observable<BlockResponse> {
    return this.http.patch<BlockResponse>(`${this.apiUrl}/${id}/unit-counts`, { totalUnits });
  }

  // Recalculate occupancy
  recalculateOccupancy(id: number): Observable<BlockResponse> {
    return this.http.patch<BlockResponse>(`${this.apiUrl}/${id}/recalculate-occupancy`, {});
  }

  // Validate block name uniqueness within phase
  validateBlockName(phaseId: number, name: string, excludeBlockId?: number): Observable<BlockResponse> {
    const params = new URLSearchParams();
    params.append('phaseId', phaseId.toString());
    params.append('name', name);
    if (excludeBlockId) {
      params.append('excludeBlockId', excludeBlockId.toString());
    }
    
    return this.http.get<BlockResponse>(`${this.apiUrl}/validate-block-name?${params.toString()}`);
  }
}