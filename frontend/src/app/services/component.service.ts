import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface Component {
  id: number;
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class ComponentService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  private handleError(error: any): Observable<never> {
    console.error('ComponentService error:', error);
    return throwError(() => error);
  }

  // Get all components
  getAllComponents(): Observable<{ data: Component[] }> {
    return this.http.get<{ data: Component[] }>(`${this.API_URL}/components`)
      .pipe(catchError(this.handleError));
  }

  // Get component by ID
  getComponentById(componentId: number): Observable<{ data: Component }> {
    return this.http.get<{ data: Component }>(`${this.API_URL}/components/${componentId}`)
      .pipe(catchError(this.handleError));
  }

  // Create component
  createComponent(componentData: { name: string; description: string }): Observable<{ data: Component; message: string }> {
    return this.http.post<{ data: Component; message: string }>(`${this.API_URL}/components`, componentData)
      .pipe(catchError(this.handleError));
  }
}
