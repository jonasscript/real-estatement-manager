import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Client {
  id: number;        // user's id (u.id)
  client_id: number; // clients table id (c.id)
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
  seller_first_name?: string;
  seller_last_name?: string;
  contract_signed: boolean;
  commercial_status?: string;
  created_at: string;
  properties?: {
    unit_identifier: string;
    model_name: string;
    full_location: string;
    final_price: number;
  }[];
}

export interface Seller {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Property {
  id: number;
  property_status_id: number;
  sale_status?: 'available' | 'reserved' | 'sold';
  model_name: string;
  property_type: string;
  unit_identifier: string;
  block_name: string;
  phase_name: string;
  status: string;
  status_color: string;
  construction_status?: string;
  construction_status_color?: string;
  final_price: number;
  final_down_payment_percentage: number;
  final_installments: number;
  commercial_status?: string;
  down_payment_percentage?: number;
  down_payment_amount?: number;
  stage_paid_amount?: number;
  remaining_down_payment_amount?: number;
  total_stages?: number;
  completed_stages?: number;
  pending_stages?: number;
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

export interface PropertyPurchaseRecord {
  purchase_id: number;
  purchase_group_id?: number;
  purchase_group_mode?: 'individual' | 'unified';
  purchase_group_total_price?: number;
  purchase_group_down_payment_percentage?: number;
  purchase_group_installments?: number;
  purchase_group_commercial_status?: string;
  purchase_group_down_payment_amount?: number;
  purchase_group_stage_paid_amount?: number;
  purchase_group_remaining_down_payment_amount?: number;
  purchase_group_property_count?: number;
  property_id: number;
  seller_id?: number;
  real_estate_id?: number;
  final_down_payment_percentage: number;
  final_installments: number;
  commercial_status?: string;
  down_payment_percentage?: number;
  down_payment_amount?: number;
  stage_paid_amount?: number;
  remaining_down_payment_amount?: number;
  total_stages?: number;
  completed_stages?: number;
  pending_stages?: number;
  purchase_date?: string;
  purchase_notes?: string;
  purchase_created_at: string;
  unit_identifier: string;
  model_name: string;
  property_type?: string;
  block_name: string;
  phase_name: string;
  sale_status?: 'available' | 'reserved' | 'sold';
  status: string;
  status_color?: string;
  construction_status?: string;
  construction_status_color?: string;
  final_price: number;
  area_sqm: number;
  bedrooms: number;
  bathrooms: number;
  full_location: string;
  seller_first_name?: string;
  seller_last_name?: string;
}

export interface AddPropertyPurchaseData {
  propertyId?: number;
  finalPrice?: number;
  finalDownPaymentPercentage?: number;
  finalInstallments?: number;
  propertyPurchases?: PropertyPurchaseInput[];
  purchaseMode?: 'individual' | 'unified';
  groupDownPaymentPercentage?: number;
  groupInstallments?: number;
  sellerId?: number | null;
  notes?: string;
}

export interface CreateClientData {
  userId: number;
  assignedSellerId?: number | null;
  contractDate?: string;
  contractSigned?: boolean;
  propertyIds?: number[];
}

export interface PropertyPurchaseInput {
  propertyId: number;
  finalPrice?: number;
  finalDownPaymentPercentage?: number;
  finalInstallments?: number;
}

export interface RegisterClientData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  birthday: string;
  phone?: string;
  propertyPurchases?: PropertyPurchaseInput[];
  purchaseMode?: 'individual' | 'unified';
  groupDownPaymentPercentage?: number;
  groupInstallments?: number;
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

  // Register client + user atomically
  registerClientWithUser(data: RegisterClientData): Observable<{ data: { user: any; client: Client } }> {
    return this.http.post<{ data: { user: any; client: Client } }>(`${this.API_URL}/clients/register`, data)
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

  // Get current user's own property purchases
  getMyProperties(): Observable<{ data: any[]; count: number }> {
    return this.http.get<{ data: any[]; count: number }>(`${this.API_URL}/clients/my-properties`)
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

  // Get all property purchases for a client
  getClientProperties(clientId: number): Observable<{ data: PropertyPurchaseRecord[]; count: number }> {
    return this.http.get<{ data: PropertyPurchaseRecord[]; count: number }>(`${this.API_URL}/clients/${clientId}/properties`)
      .pipe(catchError(this.handleError));
  }

  // Add a new property purchase to an existing client
  addPropertyToClient(clientId: number, purchaseData: AddPropertyPurchaseData): Observable<{ data: any }> {
    return this.http.post<{ data: any }>(`${this.API_URL}/clients/${clientId}/properties`, purchaseData)
      .pipe(catchError(this.handleError));
  }
}
