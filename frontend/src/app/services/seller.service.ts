import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Seller {
  id: number;
  user_id: number;
  real_estate_id: number;
  commission_rate: number;
  total_sales: number;
  total_commission: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  user_active?: boolean;
  real_estate_name?: string;
}

export interface CreateSellerData {
  userId: number;
  realEstateId: number;
  commissionRate?: number;
}

export interface SellerPerformance {
  total_sales: number;
  total_commission: number;
  commission_rate: number;
  total_clients: number;
  signed_clients: number;
  total_down_payments: number;
  total_remaining_balance: number;
}

@Injectable({
  providedIn: 'root'
})
export class SellerService {
  private API_URL = '/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    return throwError(() => error);
  }

  // Get all sellers
  getAllSellers(filters?: { realEstateId?: number; isActive?: boolean; search?: string }): Observable<{ data: Seller[]; count: number }> {
    const headers = this.getAuthHeaders();
    let params = '';

    if (filters) {
      const queryParams = [];
      if (filters.realEstateId) queryParams.push(`realEstateId=${filters.realEstateId}`);
      if (filters.isActive !== undefined) queryParams.push(`isActive=${filters.isActive}`);
      if (filters.search) queryParams.push(`search=${encodeURIComponent(filters.search)}`);
      if (queryParams.length > 0) params = '?' + queryParams.join('&');
    }

    return this.http.get<{ data: Seller[]; count: number }>(`${this.API_URL}/sellers${params}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get seller by ID
  getSellerById(sellerId: number): Observable<{ data: Seller }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Seller }>(`${this.API_URL}/sellers/${sellerId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get seller by user ID
  getSellerByUserId(userId: number): Observable<{ data: Seller }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Seller }>(`${this.API_URL}/sellers/user/${userId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Create new seller
  createSeller(sellerData: CreateSellerData): Observable<{ data: Seller }> {
    const headers = this.getAuthHeaders();
    return this.http.post<{ data: Seller }>(`${this.API_URL}/sellers`, sellerData, { headers })
      .pipe(catchError(this.handleError));
  }

  // Update seller
  updateSeller(sellerId: number, updateData: Partial<Seller>): Observable<{ data: Seller }> {
    const headers = this.getAuthHeaders();
    return this.http.put<{ data: Seller }>(`${this.API_URL}/sellers/${sellerId}`, updateData, { headers })
      .pipe(catchError(this.handleError));
  }

  // Delete seller
  deleteSeller(sellerId: number): Observable<{ data: Seller }> {
    const headers = this.getAuthHeaders();
    return this.http.delete<{ data: Seller }>(`${this.API_URL}/sellers/${sellerId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get sellers by real estate
  getSellersByRealEstate(realEstateId: number): Observable<{ data: Seller[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Seller[]; count: number }>(`${this.API_URL}/sellers/real-estate/${realEstateId}/sellers`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get users with seller role for a specific real estate
  getUsersSellersRealEstate(realEstateId: number): Observable<{ data: any[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: any[]; count: number }>(`${this.API_URL}/users/real-estate/${realEstateId}/sellers-users`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get seller statistics
  getSellerStatistics(realEstateId?: number): Observable<{ data: any }> {
    const headers = this.getAuthHeaders();
    const url = realEstateId
      ? `${this.API_URL}/sellers/statistics/real-estate/${realEstateId}`
      : `${this.API_URL}/sellers/statistics/all`;

    return this.http.get<{ data: any }>(url, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get seller performance
  getSellerPerformance(sellerId: number): Observable<{ data: SellerPerformance }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: SellerPerformance }>(`${this.API_URL}/sellers/${sellerId}/performance`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get current user's seller profile
  getMySellerProfile(): Observable<{ data: Seller }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Seller }>(`${this.API_URL}/sellers/profile/my`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get current user's seller performance
  getMySellerPerformance(): Observable<{ data: SellerPerformance }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: SellerPerformance }>(`${this.API_URL}/sellers/performance/my`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Search sellers
  searchSellers(searchTerm: string): Observable<{ data: Seller[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Seller[]; count: number }>(`${this.API_URL}/sellers/search?q=${encodeURIComponent(searchTerm)}`, { headers })
      .pipe(catchError(this.handleError));
  }
}