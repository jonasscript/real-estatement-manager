import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

interface Installment {
  id: number;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  created_at: string;
}

interface InstallmentStats {
  totalInstallments: number;
  paidInstallments: number;
  pendingInstallments: number;
  overdueInstallments: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

@Component({
  selector: 'app-installments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './installments.component.html',
  styleUrls: ['./installments.component.scss']
})
export class InstallmentsComponent implements OnInit {
  currentUser: any = null;
  installments: Installment[] = [];
  stats: InstallmentStats = {
    totalInstallments: 0,
    paidInstallments: 0,
    pendingInstallments: 0,
    overdueInstallments: 0,
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0
  };
  loading = false;

  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.loadInstallments();
  }

  loadInstallments(): void {
    this.loading = true;
    this.http.get<{ data: Installment[] }>(`${this.API_URL}/clients/installments`)
      .subscribe({
        next: (response) => {
          this.installments = response.data.sort((a, b) =>
            a.installment_number - b.installment_number
          );
          this.calculateStats();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading installments:', error);
          this.loading = false;
        }
      });
  }

  calculateStats(): void {
    const paidInstallments = this.installments.filter(inst => inst.status === 'paid');
    const pendingInstallments = this.installments.filter(inst => inst.status === 'pending');
    const overdueInstallments = this.installments.filter(inst =>
      inst.status === 'overdue' || inst.status === 'late'
    );

    this.stats = {
      totalInstallments: this.installments.length,
      paidInstallments: paidInstallments.length,
      pendingInstallments: pendingInstallments.length,
      overdueInstallments: overdueInstallments.length,
      totalAmount: this.installments.reduce((sum, inst) => sum + inst.amount, 0),
      paidAmount: paidInstallments.reduce((sum, inst) => sum + inst.amount, 0),
      remainingAmount: pendingInstallments.reduce((sum, inst) => sum + inst.amount, 0) +
                      overdueInstallments.reduce((sum, inst) => sum + inst.amount, 0)
    };
  }

  getUpcomingInstallments(): Installment[] {
    const now = new Date();
    return this.installments
      .filter(inst => new Date(inst.due_date) > now && inst.status === 'pending')
      .slice(0, 3); // Next 3 upcoming
  }

  getOverdueInstallments(): Installment[] {
    return this.installments.filter(inst =>
      inst.status === 'overdue' || inst.status === 'late'
    );
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'pending': return 'status-pending';
      case 'overdue': return 'status-overdue';
      case 'late': return 'status-late';
      default: return 'status-default';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'paid': return 'Paid';
      case 'pending': return 'Pending';
      case 'overdue': return 'Overdue';
      case 'late': return 'Late';
      default: return 'Unknown';
    }
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date() && this.getStatusText(dueDate) !== 'paid';
  }

  getDaysUntilDue(dueDate: string): number {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  logout(): void {
    this.authService.logout();
  }
}
