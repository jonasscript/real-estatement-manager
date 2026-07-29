import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type CronFrequency = 'daily' | 'weekly' | 'monthly';
export type CronExecutionStatus = 'WAITING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface CronConfiguration {
  id: number;
  real_estate_id: number;
  real_estate_name?: string;
  name: string;
  description?: string;
  job_type: string;
  frequency: CronFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  time_of_day: string;
  is_active: boolean;
  last_execution_at: string | null;
  next_execution_at: string | null;
  status: CronExecutionStatus;
  last_result: string | null;
  last_error: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CronConfigurationPayload {
  name: string;
  description?: string;
  jobType: string;
  frequency: CronFrequency;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  timeOfDay: string;
  isActive: boolean;
  realEstateId?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class CronConfigurationService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private readonly http: HttpClient) {}

  getConfigurations(realEstateId?: number | null): Observable<{ data: CronConfiguration[]; count: number }> {
    const params = realEstateId ? new HttpParams().set('realEstateId', realEstateId) : undefined;
    return this.http.get<{ data: CronConfiguration[]; count: number }>(`${this.API_URL}/cron-configurations`, { params });
  }

  createConfiguration(payload: CronConfigurationPayload): Observable<{ data: CronConfiguration }> {
    return this.http.post<{ data: CronConfiguration }>(`${this.API_URL}/cron-configurations`, payload);
  }

  updateConfiguration(id: number, payload: CronConfigurationPayload): Observable<{ data: CronConfiguration }> {
    return this.http.put<{ data: CronConfiguration }>(`${this.API_URL}/cron-configurations/${id}`, payload);
  }

  deleteConfiguration(id: number): Observable<{ data: CronConfiguration }> {
    return this.http.delete<{ data: CronConfiguration }>(`${this.API_URL}/cron-configurations/${id}`);
  }
}
