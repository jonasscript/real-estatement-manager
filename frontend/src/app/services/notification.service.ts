import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: any): Observable<never> {
    console.error('NotificationService error:', error);
    return throwError(() => error);
  }

  // Get user notifications
  getNotifications(limit?: number): Observable<{ data: Notification[] }> {
    const headers = this.getAuthHeaders();
    const params = limit ? `?limit=${limit}` : '';
    return this.http.get<{ data: Notification[] }>(`${this.API_URL}/notifications${params}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Mark notification as read
  markAsRead(notificationId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.API_URL}/notifications/${notificationId}/read`, {}, { headers })
      .pipe(catchError(this.handleError));
  }

  // Get unread notifications count
  getUnreadCount(): Observable<{ data: { count: number } }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ data: { count: number } }>(`${this.API_URL}/notifications/unread-count`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.API_URL}/notifications/mark-all-read`, {}, { headers })
      .pipe(catchError(this.handleError));
  }

  // Delete notification
  deleteNotification(notificationId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.API_URL}/notifications/${notificationId}`, { headers })
      .pipe(catchError(this.handleError));
  }
}