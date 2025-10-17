import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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
  created_by?: number;
  created_at: string;
  updated_at: string;
  created_by_first_name?: string;
  created_by_last_name?: string;
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
    private http: HttpClient,
    private authService: AuthService
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
    console.error('RealEstateService error:', error);
    return throwError(() => error);
  }

  // Get all real estates
  getAllRealEstates(): Observable<{ data: RealEstate[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: RealEstate[]; count: number }>(`${this.API_URL}/real-estates`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get real estate by ID
  getRealEstateById(realEstateId: number): Observable<{ data: RealEstate }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: RealEstate }>(`${this.API_URL}/real-estates/${realEstateId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Create new real estate
  createRealEstate(realEstateData: CreateRealEstateData): Observable<{ data: RealEstate }> {
    const headers = this.getAuthHeaders();
    return this.http.post<{ data: RealEstate }>(`${this.API_URL}/real-estates`, realEstateData, { headers })
      .pipe(catchError(this.handleError));
  }

  // Update real estate
  updateRealEstate(realEstateId: number, updateData: Partial<CreateRealEstateData>): Observable<{ data: RealEstate }> {
    const headers = this.getAuthHeaders();
    return this.http.put<{ data: RealEstate }>(`${this.API_URL}/real-estates/${realEstateId}`, updateData, { headers })
      .pipe(catchError(this.handleError));
  }

  // Delete real estate
  deleteRealEstate(realEstateId: number): Observable<{ data: RealEstate }> {
    const headers = this.getAuthHeaders();
    return this.http.delete<{ data: RealEstate }>(`${this.API_URL}/real-estates/${realEstateId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get real estate statistics
  getRealEstateStatistics(realEstateId?: number): Observable<{ data: any }> {
    const headers = this.getAuthHeaders();
    const url = realEstateId
      ? `${this.API_URL}/real-estates/${realEstateId}/statistics`
      : `${this.API_URL}/real-estates/statistics/all`;
    return this.http.get<{ data: any }>(url, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get real estates by admin
  getRealEstatesByAdmin(): Observable<{ data: RealEstate[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: RealEstate[]; count: number }>(`${this.API_URL}/real-estates/admin/my-real-estates`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Search real estates
  searchRealEstates(searchTerm: string): Observable<{ data: RealEstate[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: RealEstate[]; count: number }>(`${this.API_URL}/real-estates/search?q=${encodeURIComponent(searchTerm)}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get available real estates for registration
  getAvailableRealEstates(): Observable<{ data: RealEstate[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: RealEstate[]; count: number }>(`${this.API_URL}/real-estates/available`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get all real estates statistics
  getAllRealEstatesStatistics(): Observable<{ data: RealEstateStats[] }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: RealEstateStats[] }>(`${this.API_URL}/real-estates/statistics/all`, { headers })
      .pipe(catchError(this.handleError));
  }
}

// Property Service Methods
export interface Property {
  id: number;
  title: string;
  description: string;
  property_type: string;
  address: string;
  city: string;
  price: number;
  down_payment_percentage: number;
  total_installments: number;
  installment_amount: number;
  status: string;
  real_estate_id: number;
  real_estate_name?: string;
  created_at: string;
}

export interface CreatePropertyData {
  realEstateId: number;
  title: string;
  description: string;
  propertyType: string;
  address: string;
  city: string;
  price: number;
  downPaymentPercentage: number;
  totalInstallments: number;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
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
    console.error('PropertyService error:', error);
    return throwError(() => error);
  }

  // Get all properties
  getAllProperties(filters?: { realEstateId?: number; propertyType?: string; status?: string; search?: string }): Observable<{ data: Property[]; count: number }> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams();

    if (filters) {
      if (filters.realEstateId) params = params.set('realEstateId', filters.realEstateId.toString());
      if (filters.propertyType) params = params.set('propertyType', filters.propertyType);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.http.get<{ data: Property[]; count: number }>(`${this.API_URL}/properties`, { headers, params })
      .pipe(catchError(this.handleError));
  }

  // Get property by ID
  getPropertyById(propertyId: number): Observable<{ data: Property }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Property }>(`${this.API_URL}/properties/${propertyId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Create new property
  createProperty(propertyData: CreatePropertyData): Observable<{ data: Property }> {
    const headers = this.getAuthHeaders();

    // Calculate installment amount
    const downPaymentAmount = (propertyData.price * propertyData.downPaymentPercentage) / 100;
    const installmentAmount = downPaymentAmount / propertyData.totalInstallments;

    const payload = {
      ...propertyData,
      installmentAmount
    };

    return this.http.post<{ data: Property }>(`${this.API_URL}/properties`, payload, { headers })
      .pipe(catchError(this.handleError));
  }

  // Update property
  updateProperty(propertyId: number, updateData: Partial<CreatePropertyData & { installmentAmount?: number }>): Observable<{ data: Property }> {
    const headers = this.getAuthHeaders();

    // Recalculate installment amount if price or down payment changed
    let payload: any = { ...updateData };
    if (updateData.price && updateData.downPaymentPercentage && updateData.totalInstallments) {
      const downPaymentAmount = (updateData.price * updateData.downPaymentPercentage) / 100;
      const installmentAmount = downPaymentAmount / updateData.totalInstallments;
      payload.installmentAmount = installmentAmount;
    }

    return this.http.put<{ data: Property }>(`${this.API_URL}/properties/${propertyId}`, payload, { headers })
      .pipe(catchError(this.handleError));
  }

  // Delete property
  deleteProperty(propertyId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.API_URL}/properties/${propertyId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get properties by real estate
  getPropertiesByRealEstate(realEstateId: number): Observable<{ data: Property[]; count: number }> {
    return this.getAllProperties({ realEstateId });
  }

  // Get available properties
  getAvailableProperties(): Observable<{ data: Property[]; count: number }> {
    return this.getAllProperties({ status: 'available' });
  }

  // Search properties
  searchProperties(searchTerm: string): Observable<{ data: Property[]; count: number }> {
    return this.getAllProperties({ search: searchTerm });
  }

  // Get property statistics
  getPropertyStatistics(realEstateId?: number): Observable<{ data: any }> {
    const headers = this.getAuthHeaders();
    const url = realEstateId
      ? `${this.API_URL}/properties/statistics?realEstateId=${realEstateId}`
      : `${this.API_URL}/properties/statistics`;
    return this.http.get<{ data: any }>(url, { headers })
      .pipe(catchError(this.handleError));
  }
}