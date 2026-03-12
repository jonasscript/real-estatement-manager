import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  private readonly API_URL = '/api';

  constructor(private readonly http: HttpClient) {}

  private handleError(error: any): Observable<never> {
    console.error('NotificationService error:', error);
    return throwError(() => error);
  }

  // Get user notifications
  getNotifications(limit?: number): Observable<{ data: Notification[] }> {
    const params = limit ? `?limit=${limit}` : '';
    return this.http.get<{ data: Notification[] }>(`${this.API_URL}/notifications${params}`)
      .pipe(catchError(this.handleError));
  }

  // Mark notification as read
  markAsRead(notificationId: number): Observable<any> {
    return this.http.put(`${this.API_URL}/notifications/${notificationId}/read`, {})
      .pipe(catchError(this.handleError));
  }

  // Get unread notifications count
  getUnreadCount(): Observable<{ data: { count: number } }> {
    return this.http.get<{ data: { count: number } }>(`${this.API_URL}/notifications/unread-count`)
      .pipe(catchError(this.handleError));
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.API_URL}/notifications/mark-all-read`, {})
      .pipe(catchError(this.handleError));
  }

  // Delete notification
  deleteNotification(notificationId: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/notifications/${notificationId}`)
      .pipe(catchError(this.handleError));
  }
}