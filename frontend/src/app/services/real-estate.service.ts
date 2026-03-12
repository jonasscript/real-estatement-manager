import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface RealEstate {
  id: number;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
  created_by?: number;
  created_at: string;
  created_by_first_name?: string;
  created_by_last_name?: string;
  updated_at?: string;
}

export interface CreateRealEstateData {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
}

export interface RealEstateStats {
  id: number;
  name: string;
  property_count: number;
  client_count: number;
  signed_contracts_count: number;
  total_down_payments: number;
  total_remaining_balance: number;
}

@Injectable({
  providedIn: 'root'
})
export class RealEstateService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  private handleError(error: any): Observable<never> {
    console.error('RealEstateService error:', error);
    return throwError(() => error);
  }

  // Get all real estates
  getAllRealEstates(): Observable<{ data: RealEstate[]; count: number }> {
    return this.http.get<{ data: RealEstate[]; count: number }>(`${this.API_URL}/real-estates`)
      .pipe(catchError(this.handleError));
  }

  // Alias for getAllRealEstates
  getAll(): Observable<{ data: RealEstate[]; count: number }> {
    return this.getAllRealEstates();
  }

  // Get real estate by ID
  getRealEstateById(realEstateId: number): Observable<{ data: RealEstate }> {
    return this.http.get<{ data: RealEstate }>(`${this.API_URL}/real-estates/${realEstateId}`)
      .pipe(catchError(this.handleError));
  }

  // Create new real estate
  createRealEstate(realEstateData: CreateRealEstateData): Observable<{ data: RealEstate }> {
    return this.http.post<{ data: RealEstate }>(`${this.API_URL}/real-estates`, realEstateData)
      .pipe(catchError(this.handleError));
  }

  // Update real estate
  updateRealEstate(realEstateId: number, updateData: Partial<CreateRealEstateData>): Observable<{ data: RealEstate }> {
    return this.http.put<{ data: RealEstate }>(`${this.API_URL}/real-estates/${realEstateId}`, updateData)
      .pipe(catchError(this.handleError));
  }

  // Delete real estate
  deleteRealEstate(realEstateId: number): Observable<{ data: RealEstate }> {
    return this.http.delete<{ data: RealEstate }>(`${this.API_URL}/real-estates/${realEstateId}`)
      .pipe(catchError(this.handleError));
  }

  // Get real estate statistics
  getRealEstateStatistics(realEstateId?: number): Observable<{ data: any }> {
    const url = realEstateId
      ? `${this.API_URL}/real-estates/${realEstateId}/statistics`
      : `${this.API_URL}/real-estates/statistics/all`;
    return this.http.get<{ data: any }>(url)
      .pipe(catchError(this.handleError));
  }

  // Get real estates by admin
  getRealEstatesByAdmin(): Observable<{ data: RealEstate[]; count: number }> {
    return this.http.get<{ data: RealEstate[]; count: number }>(`${this.API_URL}/real-estates/admin/my-real-estates`)
      .pipe(catchError(this.handleError));
  }

  // Search real estates
  searchRealEstates(searchTerm: string): Observable<{ data: RealEstate[]; count: number }> {
    return this.http.get<{ data: RealEstate[]; count: number }>(`${this.API_URL}/real-estates/search?q=${encodeURIComponent(searchTerm)}`)
      .pipe(catchError(this.handleError));
  }

  // Get available real estates for registration
  getAvailableRealEstates(): Observable<{ data: RealEstate[]; count: number }> {
    return this.http.get<{ data: RealEstate[]; count: number }>(`${this.API_URL}/real-estates/available`)
      .pipe(catchError(this.handleError));
  }

  // Get all real estates statistics
  getAllRealEstatesStatistics(): Observable<{ data: RealEstateStats[] }> {
    return this.http.get<{ data: RealEstateStats[] }>(`${this.API_URL}/real-estates/statistics/all`)
      .pipe(catchError(this.handleError));
  }
}

// Property Service Methods
export interface Property {
  id: number;
  property_model_id: number;
  unit_id: number;
  property_status_id: number;
  land_area_sqm?: number;
  area_sqm?: number;
  custom_price?: number;
  custom_down_payment_percentage?: number;
  custom_installments?: number;
  notes?: string;
  created_by?: number;
  model_name?: string;
  property_type?: string;
  unit_identifier?: string;
  unit_number?: string;
  block_name?: string;
  phase_name?: string;
  phase_type?: string;
  status?: string;
  status_color?: string;
  full_location?: string;
  real_estate_id?: number;
  real_estate_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreatePropertyData {
  propertyModelId: number;
  unitId: number;
  propertyStatusId?: number;
  landAreaSqm?: number;
  customPrice?: number;
  customDownPaymentPercentage?: number;
  customInstallments?: number;
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {}

  private handleError(error: any): Observable<never> {
    console.error('PropertyService error:', error);
    return throwError(() => error);
  }

  // Get all properties
  getAllProperties(filters?: { realEstateId?: number; propertyTypeId?: number; statusId?: number; phaseId?: number; blockId?: number; search?: string }): Observable<{ data: Property[]; count: number }> {
    let params = new HttpParams();

    if (filters) {
      if (filters.realEstateId) params = params.set('realEstateId', filters.realEstateId.toString());
      if (filters.propertyTypeId) params = params.set('propertyTypeId', filters.propertyTypeId.toString());
      if (filters.statusId) params = params.set('statusId', filters.statusId.toString());
      if (filters.phaseId) params = params.set('phaseId', filters.phaseId.toString());
      if (filters.blockId) params = params.set('blockId', filters.blockId.toString());
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.http.get<{ data: Property[]; count: number }>(`${this.API_URL}/properties`, { params })
      .pipe(catchError(this.handleError));
  }

  // Get property by ID
  getPropertyById(propertyId: number): Observable<{ data: Property }> {
    return this.http.get<{ data: Property }>(`${this.API_URL}/properties/${propertyId}`)
      .pipe(catchError(this.handleError));
  }

  // Create new property
  createProperty(propertyData: CreatePropertyData): Observable<{ data: Property }> {
    return this.http.post<{ data: Property }>(`${this.API_URL}/properties`, propertyData)
      .pipe(catchError(this.handleError));
  }

  // Update property
  updateProperty(propertyId: number, updateData: Partial<CreatePropertyData>): Observable<{ data: Property }> {
    return this.http.put<{ data: Property }>(`${this.API_URL}/properties/${propertyId}`, updateData)
      .pipe(catchError(this.handleError));
  }

  // Delete property
  deleteProperty(propertyId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/properties/${propertyId}`)
      .pipe(catchError(this.handleError));
  }

  // Get properties by real estate
  getPropertiesByRealEstate(realEstateId: number): Observable<{ data: Property[]; count: number }> {
    return this.http.get<{ data: Property[]; count: number }>(`${this.API_URL}/properties/real-estate/${realEstateId}`)
      .pipe(catchError(this.handleError));
  }

  // Get available properties
  getAvailableProperties(): Observable<{ data: Property[]; count: number }> {
    return this.http.get<{ data: Property[]; count: number }>(`${this.API_URL}/properties/available/all`)
      .pipe(catchError(this.handleError));
  }

  // Search properties
  searchProperties(searchTerm: string): Observable<{ data: Property[]; count: number }> {
    return this.getAllProperties({ search: searchTerm });
  }

  // Get property statistics
  getPropertyStatistics(realEstateId?: number): Observable<{ data: any }> {
    const url = realEstateId
      ? `${this.API_URL}/properties/statistics/real-estate/${realEstateId}`
      : `${this.API_URL}/properties/statistics/all`;
    return this.http.get<{ data: any }>(url)
      .pipe(catchError(this.handleError));
  }
}