import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface Client {
  id: number;
  user_id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  property_id: number;
  property_title?: string;
  real_estate_name?: string;
  contract_signed: boolean;
  total_down_payment: number;
  remaining_balance: number;
  created_at: string;
  last_payment_date?: string;
  overdue_installments?: number;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  related_client_id?: number;
  client_name?: string;
}

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  totalPayments: number;
  overduePayments: number;
  recentPayments: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './seller-dashboard.component.html',
  styleUrls: ['./seller-dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: any = null;
  stats: DashboardStats = {
    totalClients: 0,
    activeClients: 0,
    totalPayments: 0,
    overduePayments: 0,
    recentPayments: 0
  };

  assignedClients: Client[] = [];
  allClients: Client[] = [];
  notifications: Notification[] = [];
  loading = false;

  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.loadAssignedClients();
    this.loadAllClients();
    this.loadNotifications();
    this.calculateStats();
  }

  loadAssignedClients(): void {
    const headers = this.authService.getAuthHeaders();
    this.http.get<{ data: Client[]; count: number }>(`${this.API_URL}/clients/assigned`, { headers })
      .subscribe({
        next: (response) => {
          this.assignedClients = response.data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading assigned clients:', error);
          this.loading = false;
        }
      });
  }

  loadAllClients(): void {
    const headers = this.authService.getAuthHeaders();
    this.http.get<{ data: Client[]; count: number }>(`${this.API_URL}/clients/all`, { headers })
      .subscribe({
        next: (response) => {
          this.allClients = response.data;
        },
        error: (error) => {
          console.error('Error loading all clients:', error);
        }
      });
  }

  loadNotifications(): void {
    const headers = this.authService.getAuthHeaders();
    this.http.get<{ data: Notification[]; count: number }>(`${this.API_URL}/notifications`, { headers })
      .subscribe({
        next: (response) => {
          this.notifications = response.data.slice(0, 10); // Show latest 10
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
        }
      });
  }

  calculateStats(): void {
    // Calculate stats based on loaded data
    this.stats.totalClients = this.allClients.length;
    this.stats.activeClients = this.allClients.filter(c => c.contract_signed).length;

    // Mock data for payments - in real app, this would come from API
    this.stats.totalPayments = this.allClients.reduce((sum, client) =>
      sum + (client.total_down_payment - client.remaining_balance), 0
    );
    this.stats.overduePayments = this.allClients.filter(c => c.overdue_installments && c.overdue_installments > 0).length;
    this.stats.recentPayments = Math.floor(this.stats.totalPayments * 0.3); // Mock recent payments
  }

  markNotificationAsRead(notificationId: number): void {
    const headers = this.authService.getAuthHeaders();
    this.http.put(`${this.API_URL}/notifications/${notificationId}/read`, {}, { headers })
      .subscribe({
        next: () => {
          const notification = this.notifications.find(n => n.id === notificationId);
          if (notification) {
            notification.is_read = true;
          }
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
  }

  getClientStatus(client: Client): string {
    if (client.contract_signed) {
      return 'Active';
    }
    return 'Pending';
  }

  getStatusClass(client: Client): string {
    return client.contract_signed ? 'status-active' : 'status-pending';
  }

  getPaymentProgress(client: Client): number {
    if (client.total_down_payment === 0) return 0;
    const paid = client.total_down_payment - client.remaining_balance;
    return Math.round((paid / client.total_down_payment) * 100);
  }

  getUnreadNotificationsCount(): number {
    return this.notifications.filter(n => !n.is_read).length;
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'payment_uploaded':
        return 'icon-upload';
      case 'payment_approved':
        return 'icon-check';
      case 'payment_rejected':
        return 'icon-x';
      case 'payment_overdue':
        return 'icon-alert';
      default:
        return 'icon-bell';
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
