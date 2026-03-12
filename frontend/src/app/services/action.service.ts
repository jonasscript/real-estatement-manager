import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Action {
  id: number;
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActionService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private handleError(error: any): Observable<never> {
    console.error('ActionService error:', error);
    return throwError(() => error);
  }

  // Get all actions
  getAllActions(): Observable<{ data: Action[] }> {
    return this.http.get<{ data: Action[] }>(`${this.API_URL}/actions`)
      .pipe(catchError(this.handleError));
  }

  // Get action by ID
  getActionById(actionId: number): Observable<{ data: Action }> {
    return this.http.get<{ data: Action }>(`${this.API_URL}/actions/${actionId}`)
      .pipe(catchError(this.handleError));
  }

  // Create action
  createAction(actionData: { name: string; description: string }): Observable<{ data: Action; message: string }> {
    return this.http.post<{ data: Action; message: string }>(`${this.API_URL}/actions`, actionData)
      .pipe(catchError(this.handleError));
  }
}
