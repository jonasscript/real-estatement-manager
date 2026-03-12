import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
    private readonly http: HttpClient
  ) {}

  private handleError(error: any): Observable<never> {
    console.error('ClientService error:', error);
    return throwError(() => error);
  }

  // Get clients by real estate
  getClientsByRealEstate(realEstateId: number): Observable<{ data: Client[]; count: number }> {
    return this.http.get<{ data: Client[]; count: number }>(`${this.API_URL}/users/real-estate/${realEstateId}/clients`)
      .pipe(catchError(this.handleError));
  }

  // Get sellers by real estate
  getSellersByRealEstate(realEstateId: number): Observable<{ data: Seller[] }> {
    return this.http.get<{ data: Seller[] }>(`${this.API_URL}/users/real-estate/${realEstateId}/sellers`)
      .pipe(catchError(this.handleError));
  }

  // Get only sellers by real estate (role_id = 3)
  getSellersOnlyByRealEstate(realEstateId: number): Observable<{ data: Seller[]; count: number }> {
    return this.http.get<{ data: Seller[]; count: number }>(`${this.API_URL}/users/real-estate/${realEstateId}/sellers-only`)
      .pipe(catchError(this.handleError));
  }

  // Get available clients by real estate (role_id = 4, not already clients)
  getAvailableClientsByRealEstate(realEstateId: number): Observable<{ data: any[]; count: number }> {
    return this.http.get<{ data: any[]; count: number }>(`${this.API_URL}/users/real-estate/${realEstateId}/available-clients`)
      .pipe(catchError(this.handleError));
  }

  // Get properties by real estate
  getPropertiesByRealEstate(realEstateId: number): Observable<{ data: Property[] }> {
    return this.http.get<{ data: Property[] }>(`${this.API_URL}/properties/real-estate/${realEstateId}`)
      .pipe(catchError(this.handleError));
  }

  // Create new client
  createClient(clientData: CreateClientData): Observable<{ data: Client }> {
    return this.http.post<{ data: Client }>(`${this.API_URL}/clients`, clientData)
      .pipe(catchError(this.handleError));
  }

  // Assign seller to client
  assignSellerToClient(clientId: number, sellerId: number): Observable<any> {
    return this.http.put(`${this.API_URL}/users/clients/${clientId}/assign-seller`, { sellerId })
      .pipe(catchError(this.handleError));
  }

  // Get all clients (admin)
  getAllClients(filters?: any): Observable<{ data: Client[]; count: number }> {
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
    return this.http.get<{ data: Client[]; count: number }>(`${this.API_URL}/clients/all${params}`)
      .pipe(catchError(this.handleError));
  }

  // Get assigned clients (seller)
  getAssignedClients(): Observable<{ data: Client[]; count: number }> {
    return this.http.get<{ data: Client[]; count: number }>(`${this.API_URL}/clients/assigned`)
      .pipe(catchError(this.handleError));
  }

  // Get client by ID
  getClientById(clientId: number): Observable<{ data: Client }> {
    return this.http.get<{ data: Client }>(`${this.API_URL}/clients/${clientId}`)
      .pipe(catchError(this.handleError));
  }

  // Update client
  updateClient(clientId: number, updateData: any): Observable<{ data: Client }> {
    return this.http.put<{ data: Client }>(`${this.API_URL}/clients/${clientId}`, updateData)
      .pipe(catchError(this.handleError));
  }

  // Delete client
  deleteClient(clientId: number): Observable<{ data: Client }> {
    return this.http.delete<{ data: Client }>(`${this.API_URL}/clients/${clientId}`)
      .pipe(catchError(this.handleError));
  }

  // Get client statistics
  getClientStatistics(realEstateId?: number): Observable<{ data: any }> {
    const url = realEstateId
      ? `${this.API_URL}/clients/statistics/overview?realEstateId=${realEstateId}`
      : `${this.API_URL}/clients/statistics/overview`;
    return this.http.get<{ data: any }>(url)
      .pipe(catchError(this.handleError));
  }

  // Get client payment summary
  getClientPaymentSummary(clientId: number): Observable<{ data: any }> {
    return this.http.get<{ data: any }>(`${this.API_URL}/clients/${clientId}/payment-summary`)
      .pipe(catchError(this.handleError));
  }

  // Get current user's client profile
  getMyClientProfile(): Observable<{ data: Client }> {
    return this.http.get<{ data: Client }>(`${this.API_URL}/clients/my-info`)
      .pipe(catchError(this.handleError));
  }

  // Get current user's payment summary
  getMyPaymentSummary(): Observable<{ data: any }> {
    return this.http.get<{ data: any }>(`${this.API_URL}/clients/payment-summary`)
      .pipe(catchError(this.handleError));
  }

  // Get client's installments
  getClientInstallments(clientId: number): Observable<{ data: any[]; count: number }> {
    return this.http.get<{ data: any[]; count: number }>(`${this.API_URL}/clients/${clientId}/installments`)
      .pipe(catchError(this.handleError));
  }

  // Get client's payments
  getClientPayments(clientId: number): Observable<{ data: any[]; count: number }> {
    return this.http.get<{ data: any[]; count: number }>(`${this.API_URL}/clients/${clientId}/payments`)
      .pipe(catchError(this.handleError));
  }

  // Get current user's installments
  getMyInstallments(): Observable<{ data: any[]; count: number }> {
    return this.http.get<{ data: any[]; count: number }>(`${this.API_URL}/clients/installments`)
      .pipe(catchError(this.handleError));
  }

  // Get current user's payments
  getMyPayments(): Observable<{ data: any[]; count: number }> {
    return this.http.get<{ data: any[]; count: number }>(`${this.API_URL}/clients/payments`)
      .pipe(catchError(this.handleError));
  }
}