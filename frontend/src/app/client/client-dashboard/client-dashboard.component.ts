import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ClientService, Client } from '../../services/client.service';
import { NotificationService, Notification } from '../../services/notification.service';

interface ClientInfo extends Client {}

interface Installment {
  id: number;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
}

interface Payment {
  id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string;
  proof_file_path?: string;
  notes?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.scss']
})
export class ClientDashboardComponent implements OnInit {
  currentUser: any = null;
  clientInfo: ClientInfo | null = null;
  installments: Installment[] = [];
  recentPayments: Payment[] = [];
  notifications: Notification[] = [];
  loading = false;


  constructor(
    private authService: AuthService,
    private clientService: ClientService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.loadClientData();
  }

  loadClientData(): void {
    this.loading = true;
    this.loadClientInfo();
    this.loadInstallments();
    this.loadRecentPayments();
    this.loadNotifications();
  }

  loadClientInfo(): void {
    this.clientService.getMyClientProfile().subscribe({
      next: (response) => {
        this.clientInfo = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading client info:', error);
        this.loading = false;
      }
    });
  }

  loadInstallments(): void {
    this.clientService.getMyInstallments().subscribe({
      next: (response) => {
        this.installments = response.data;
      },
      error: (error) => {
        console.error('Error loading installments:', error);
      }
    });
  }

  loadRecentPayments(): void {
    this.clientService.getMyPayments().subscribe({
      next: (response) => {
        this.recentPayments = response.data.slice(0, 5); // Get first 5 payments
      },
      error: (error) => {
        console.error('Error loading recent payments:', error);
      }
    });
  }

  loadNotifications(): void {
    this.notificationService.getNotifications(5).subscribe({
      next: (response) => {
        this.notifications = response.data;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
      }
    });
  }

  getPaymentProgress(): number {
    // Since total_down_payment and remaining_balance fields were removed,
    // we need to calculate progress from payment summary
    // For now, return 0 as placeholder
    return 0;
  }

  getNextInstallment(): Installment | null {
    const pendingInstallments = this.installments.filter(inst => inst.status === 'pending');
    return pendingInstallments.length > 0 ? pendingInstallments[0] : null;
  }

  getOverdueInstallments(): Installment[] {
    return this.installments.filter(inst => inst.status === 'overdue' || inst.status === 'late');
  }

  getOverdueTotal(): number {
    return this.getOverdueInstallments().reduce((sum, inst) => sum + inst.amount, 0);
  }

  getUpcomingInstallments(): Installment[] {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    return this.installments.filter(inst => {
      const dueDate = new Date(inst.due_date);
      return dueDate >= today && dueDate <= nextWeek && inst.status === 'pending';
    });
  }

  getInstallmentStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'pending': return 'status-pending';
      case 'overdue': return 'status-overdue';
      case 'late': return 'status-late';
      default: return 'status-default';
    }
  }

  getPaymentStatusClass(status: string): string {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      default: return 'status-default';
    }
  }

  markNotificationAsRead(notificationId: number): void {
    this.notificationService.markAsRead(notificationId).subscribe({
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

  logout(): void {
    this.authService.logout();
  }
}
