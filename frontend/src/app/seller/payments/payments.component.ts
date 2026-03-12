import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

interface Payment {
  id: number;
  installment_id: number;
  client_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string;
  notes?: string;
  client_name?: string;
  property_title?: string;
}

interface PaymentStats {
  totalPayments: number;
  approvedPayments: number;
  pendingPayments: number;
  rejectedPayments: number;
  totalAmount: number;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss']
})
export class PaymentsComponent implements OnInit {
  currentUser: any = null;
  payments: Payment[] = [];
  stats: PaymentStats = {
    totalPayments: 0,
    approvedPayments: 0,
    pendingPayments: 0,
    rejectedPayments: 0,
    totalAmount: 0
  };
  loading = false;
  filterStatus: string = 'all';

  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.loadPayments();
  }

  loadPayments(): void {
    this.loading = true;
    const headers = this.authService.getAuthHeaders();
    this.http.get<{ data: Payment[]; count: number }>(`${this.API_URL}/payments/seller`, { headers })
      .subscribe({
        next: (response) => {
          this.payments = response.data;
          this.calculateStats();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading payments:', error);
          this.loading = false;
        }
      });
  }

  calculateStats(): void {
    this.stats = {
      totalPayments: this.payments.length,
      approvedPayments: this.payments.filter(p => p.status === 'approved').length,
      pendingPayments: this.payments.filter(p => p.status === 'pending').length,
      rejectedPayments: this.payments.filter(p => p.status === 'rejected').length,
      totalAmount: this.payments.reduce((sum, payment) => sum + payment.amount, 0)
    };
  }

  getFilteredPayments(): Payment[] {
    if (this.filterStatus === 'all') {
      return this.payments;
    }
    return this.payments.filter(payment => payment.status === this.filterStatus);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      default: return 'status-default';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending';
      case 'rejected': return 'Rejected';
      default: return 'Unknown';
    }
  }

  approvePayment(paymentId: number): void {
    const headers = this.authService.getAuthHeaders();
    this.http.put(`${this.API_URL}/payments/${paymentId}/approve`, {}, { headers })
      .subscribe({
        next: () => {
          const payment = this.payments.find(p => p.id === paymentId);
          if (payment) {
            payment.status = 'approved';
            this.calculateStats();
          }
        },
        error: (error) => {
          console.error('Error approving payment:', error);
        }
      });
  }

  rejectPayment(paymentId: number): void {
    const headers = this.authService.getAuthHeaders();
    this.http.put(`${this.API_URL}/payments/${paymentId}/reject`, {}, { headers })
      .subscribe({
        next: () => {
          const payment = this.payments.find(p => p.id === paymentId);
          if (payment) {
            payment.status = 'rejected';
            this.calculateStats();
          }
        },
        error: (error) => {
          console.error('Error rejecting payment:', error);
        }
      });
  }

  logout(): void {
    this.authService.logout();
  }
}
