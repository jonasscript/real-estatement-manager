import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type StageValueType = 'fixed_amount' | 'percentage';
export type ClientPurchaseStageStatus = 'pending' | 'payment_pending' | 'approved' | 'rejected' | 'completed';

export interface PurchaseStageDefinition {
  id: number;
  real_estate_id: number;
  name: string;
  description?: string;
  sort_order: number;
  value_type: StageValueType;
  value: number;
  requires_payment: boolean;
  requires_approval: boolean;
  blocks_next_stage: boolean;
  is_active: boolean;
}

export interface PurchaseStagePayload {
  name: string;
  description?: string;
  sortOrder: number;
  valueType: StageValueType;
  value: number;
  requiresPayment: boolean;
  requiresApproval: boolean;
  blocksNextStage: boolean;
  isActive: boolean;
}

export interface ClientPurchaseStage {
  id: number;
  client_id: number;
  property_purchase_id: number;
  name: string;
  description?: string;
  sort_order: number;
  value_type: StageValueType;
  value: number;
  amount_due: number;
  paid_amount: number;
  approved_paid_amount: number;
  pending_paid_amount: number;
  requires_payment: boolean;
  requires_approval: boolean;
  blocks_next_stage: boolean;
  status: ClientPurchaseStageStatus;
}

export interface PropertyStageOverride {
  stage_definition_id: number;
  name: string;
  sort_order: number;
  default_value_type: StageValueType;
  default_value: number;
  default_requires_payment: boolean;
  default_requires_approval: boolean;
  default_blocks_next_stage: boolean;
  override_id?: number;
  value_type?: StageValueType;
  value?: number;
  requires_payment?: boolean;
  requires_approval?: boolean;
  blocks_next_stage?: boolean;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PurchaseStageService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private readonly http: HttpClient) {}

  getDefinitions(): Observable<{ data: PurchaseStageDefinition[]; count: number }> {
    return this.http.get<{ data: PurchaseStageDefinition[]; count: number }>(`${this.API_URL}/purchase-stages/definitions`);
  }

  createDefinition(payload: PurchaseStagePayload): Observable<{ data: PurchaseStageDefinition }> {
    return this.http.post<{ data: PurchaseStageDefinition }>(`${this.API_URL}/purchase-stages/definitions`, payload);
  }

  updateDefinition(id: number, payload: PurchaseStagePayload): Observable<{ data: PurchaseStageDefinition }> {
    return this.http.put<{ data: PurchaseStageDefinition }>(`${this.API_URL}/purchase-stages/definitions/${id}`, payload);
  }

  deleteDefinition(id: number): Observable<{ data: PurchaseStageDefinition }> {
    return this.http.delete<{ data: PurchaseStageDefinition }>(`${this.API_URL}/purchase-stages/definitions/${id}`);
  }

  getPropertyOverrides(propertyId: number): Observable<{ data: PropertyStageOverride[]; count: number }> {
    return this.http.get<{ data: PropertyStageOverride[]; count: number }>(
      `${this.API_URL}/properties/${propertyId}/stage-overrides`
    );
  }

  updatePropertyOverrides(
    propertyId: number,
    overrides: Array<{
      stageDefinitionId: number;
      valueType?: StageValueType;
      value?: number;
      requiresPayment?: boolean;
      requiresApproval?: boolean;
      blocksNextStage?: boolean;
      isActive?: boolean;
    }>
  ): Observable<{ data: PropertyStageOverride[] }> {
    return this.http.put<{ data: PropertyStageOverride[] }>(
      `${this.API_URL}/properties/${propertyId}/stage-overrides`,
      { overrides }
    );
  }

  getClientPurchaseStages(clientId: number, purchaseId: number): Observable<{ data: ClientPurchaseStage[]; count: number }> {
    return this.http.get<{ data: ClientPurchaseStage[]; count: number }>(
      `${this.API_URL}/clients/${clientId}/purchases/${purchaseId}/stages`
    );
  }

  createStagePayment(stageId: number, payload: FormData): Observable<{ data: any }> {
    return this.http.post<{ data: any }>(`${this.API_URL}/client-purchase-stages/${stageId}/payments`, payload);
  }

  generateDownPaymentSchedule(
    purchaseId: number,
    payload: { downPaymentPercentage: number; installmentsCount: number; firstInstallmentDate: string }
  ): Observable<{ data: any }> {
    return this.http.post<{ data: any }>(
      `${this.API_URL}/property-purchases/${purchaseId}/generate-down-payment-schedule`,
      payload
    );
  }
}
