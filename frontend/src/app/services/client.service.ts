import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Client {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  assigned_seller_id?: number;
  assigned_seller_name?: string;
  assigned_seller?: {
    id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
  real_estate_name?: string;
  contract_signed: boolean;
  created_at: string;
}

export interface Seller {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Property {
  id: number;
  model_name: string;
  property_type: string;
  unit_identifier: string;
  block_name: string;
  phase_name: string;
  status: string;
  status_color: string;
  final_price: number;
  final_down_payment_percentage: number;
  final_installments: number;
  final_installment_amount: number;
  area_sqm: number;
  bedrooms: number;
  bathrooms: number;
  parking_spaces: number;
  features: string[];
  notes?: string;
  full_location: string;
  created_at: string;
  updated_at: string;
}

export interface CreateClientData {
  userId: number;
  assignedSellerId?: number | null;
  contractDate?: string;
  contractSigned?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
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
    console.error('ClientService error:', error);
    return throwError(() => error);
  }

  // Get clients by real estate
  getClientsByRealEstate(realEstateId: number): Observable<{ data: Client[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Client[]; count: number }>(`${this.API_URL}/users/real-estate/${realEstateId}/clients`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get sellers by real estate
  getSellersByRealEstate(realEstateId: number): Observable<{ data: Seller[] }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Seller[] }>(`${this.API_URL}/users/real-estate/${realEstateId}/sellers`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get only sellers by real estate (role_id = 3)
  getSellersOnlyByRealEstate(realEstateId: number): Observable<{ data: Seller[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Seller[]; count: number }>(`${this.API_URL}/users/real-estate/${realEstateId}/sellers-only`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get available clients by real estate (role_id = 4, not already clients)
  getAvailableClientsByRealEstate(realEstateId: number): Observable<{ data: any[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: any[]; count: number }>(`${this.API_URL}/users/real-estate/${realEstateId}/available-clients`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get properties by real estate
  getPropertiesByRealEstate(realEstateId: number): Observable<{ data: Property[] }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Property[] }>(`${this.API_URL}/properties/real-estate/${realEstateId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Create new client
  createClient(clientData: CreateClientData): Observable<{ data: Client }> {
    const headers = this.getAuthHeaders();
    return this.http.post<{ data: Client }>(`${this.API_URL}/clients`, clientData, { headers })
      .pipe(catchError(this.handleError));
  }

  // Assign seller to client
  assignSellerToClient(clientId: number, sellerId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.API_URL}/users/clients/${clientId}/assign-seller`, { sellerId }, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get all clients (admin)
  getAllClients(filters?: any): Observable<{ data: Client[]; count: number }> {
    const headers = this.getAuthHeaders();
    let params = '';
    if (filters) {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null) {
          queryParams.append(key, filters[key].toString());
        }
      });
      params = '?' + queryParams.toString();
    }
    return this.http.get<{ data: Client[]; count: number }>(`${this.API_URL}/clients/all${params}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get assigned clients (seller)
  getAssignedClients(): Observable<{ data: Client[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Client[]; count: number }>(`${this.API_URL}/clients/assigned`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get client by ID
  getClientById(clientId: number): Observable<{ data: Client }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Client }>(`${this.API_URL}/clients/${clientId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Update client
  updateClient(clientId: number, updateData: any): Observable<{ data: Client }> {
    const headers = this.getAuthHeaders();
    return this.http.put<{ data: Client }>(`${this.API_URL}/clients/${clientId}`, updateData, { headers })
      .pipe(catchError(this.handleError));
  }

  // Delete client
  deleteClient(clientId: number): Observable<{ data: Client }> {
    const headers = this.getAuthHeaders();
    return this.http.delete<{ data: Client }>(`${this.API_URL}/clients/${clientId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get client statistics
  getClientStatistics(realEstateId?: number): Observable<{ data: any }> {
    const headers = this.getAuthHeaders();
    const url = realEstateId
      ? `${this.API_URL}/clients/statistics/overview?realEstateId=${realEstateId}`
      : `${this.API_URL}/clients/statistics/overview`;
    return this.http.get<{ data: any }>(url, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get client payment summary
  getClientPaymentSummary(clientId: number): Observable<{ data: any }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: any }>(`${this.API_URL}/clients/${clientId}/payment-summary`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get current user's client profile
  getMyClientProfile(): Observable<{ data: Client }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: Client }>(`${this.API_URL}/clients/my-info`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get current user's payment summary
  getMyPaymentSummary(): Observable<{ data: any }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: any }>(`${this.API_URL}/clients/payment-summary`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get client's installments
  getClientInstallments(clientId: number): Observable<{ data: any[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: any[]; count: number }>(`${this.API_URL}/clients/${clientId}/installments`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get client's payments
  getClientPayments(clientId: number): Observable<{ data: any[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: any[]; count: number }>(`${this.API_URL}/clients/${clientId}/payments`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get current user's installments
  getMyInstallments(): Observable<{ data: any[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: any[]; count: number }>(`${this.API_URL}/clients/installments`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get current user's payments
  getMyPayments(): Observable<{ data: any[]; count: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: any[]; count: number }>(`${this.API_URL}/clients/payments`, { headers })
      .pipe(catchError(this.handleError));
  }
}