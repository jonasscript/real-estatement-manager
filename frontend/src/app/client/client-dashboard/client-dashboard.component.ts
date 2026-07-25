import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ClientService, Client } from '../../services/client.service';
import { NotificationService, Notification } from '../../services/notification.service';

interface ClientInfo extends Client {
  contract_date?: string;
}

interface Installment {
  id: number;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
  property_purchase_id?: number;
}

interface Payment {
  id: number;
  amount: number;
  payment_date: string;
  created_at?: string;
  payment_method: string;
  status: string;
  proof_file_path?: string;
  notes?: string;
}

interface NextPaymentCard {
  prop: any;
  installment: Installment;
  daysLeft: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './client-dashboard.component.html',
  styleUrls: ['./client-dashboard.component.scss']
})
export class ClientDashboardComponent implements OnInit {
  currentUser: any = null;
  clientInfo: ClientInfo | null = null;
  clientProperties: any[] = [];
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
    this.loadProperties();
    this.loadInstallments();
    this.loadRecentPayments();
    this.loadNotifications();
  }

  loadClientInfo(): void {
    this.clientService.getMyClientProfile().subscribe({
      next: (response) => { this.clientInfo = response.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  loadProperties(): void {
    this.clientService.getMyProperties().subscribe({
      next: (response) => { this.clientProperties = response.data ?? []; },
      error: () => {}
    });
  }

  loadInstallments(): void {
    this.clientService.getMyInstallments().subscribe({
      next: (response) => { this.installments = response.data ?? []; },
      error: () => {}
    });
  }

  loadRecentPayments(): void {
    this.clientService.getMyPayments().subscribe({
      next: (response) => { this.recentPayments = (response.data ?? []).slice(0, 5); },
      error: () => {}
    });
  }

  loadNotifications(): void {
    this.notificationService.getNotifications(5).subscribe({
      next: (response) => { this.notifications = response.data; },
      error: () => {}
    });
  }

  // ── Next-payment cards: one per property ──────────────────
  get nextPaymentCards(): NextPaymentCard[] {
    if (this.clientProperties.length === 0) {
      // No property info yet — show global next
      const inst = this.installments.find(i =>
        i.status === 'pending' || i.status === 'overdue' || i.status === 'late'
      );
      if (!inst) return [];
      return [{ prop: null, installment: inst, daysLeft: this.daysUntil(inst.due_date) }];
    }
    return this.clientProperties
      .map(prop => {
        const inst = this.installments
          .filter(i => i.property_purchase_id === prop.purchase_id &&
            (i.status === 'pending' || i.status === 'overdue' || i.status === 'late'))
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
        return inst ? { prop, installment: inst, daysLeft: this.daysUntil(inst.due_date) } : null;
      })
      .filter((c): c is NextPaymentCard => c !== null);
  }

  daysUntil(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  }

  daysLabel(days: number): string {
    if (days < 0) return `Vencida hace ${Math.abs(days)} día(s)`;
    if (days === 0) return 'Vence hoy';
    return `Vence en ${days} día(s)`;
  }

  daysClass(days: number): string {
    if (days < 0) return 'chip-overdue';
    if (days <= 7) return 'chip-urgent';
    return 'chip-ok';
  }

  // ── Installments helpers ──────────────────────────────────
  get overdueInstallments(): Installment[] {
    return this.installments.filter(i => i.status === 'overdue' || i.status === 'late');
  }

  get overdueTotal(): number {
    return this.overdueInstallments.reduce((s, i) => s + Number(i.amount), 0);
  }

  get totalPaid(): number {
    return this.installments
      .filter(i => i.status === 'paid')
      .reduce((s, i) => s + Number(i.amount), 0);
  }

  get totalAmount(): number {
    return this.installments.reduce((s, i) => s + Number(i.amount), 0);
  }

  get paidProgress(): number {
    return this.totalAmount > 0 ? Math.round((this.totalPaid / this.totalAmount) * 100) : 0;
  }

  get paidCount(): number {
    return this.installments.filter(i => i.status === 'paid').length;
  }

  get pendingCount(): number {
    return this.installments.filter(i => i.status === 'pending' || i.status === 'pending_approval').length;
  }

  // ── Status helpers ────────────────────────────────────────
  installmentStatusLabel(status: string): string {
    switch (status) {
      case 'paid': return 'Pagada';
      case 'pending': return 'Pendiente';
      case 'pending_approval': return 'En revisión';
      case 'overdue': return 'Vencida';
      case 'late': return 'Atrasada';
      default: return status;
    }
  }

  getInstallmentStatusClass(status: string): string {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'pending': return 'status-pending';
      case 'overdue': return 'status-overdue';
      case 'late': return 'status-late';
      case 'pending_approval': return 'status-review';
      default: return 'status-default';
    }
  }

  paymentMethodLabel(method: string): string {
    switch (method) {
      case 'bank_transfer': return 'Transferencia';
      case 'deposit': return 'Depósito';
      default: return method ?? '—';
    }
  }

  paymentStatusLabel(status: string): string {
    switch (status) {
      case 'approved': return 'Aprobado';
      case 'pending': return 'En revisión';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  }

  getPaymentStatusClass(status: string): string {
    switch (status) {
      case 'approved': return 'badge-paid';
      case 'pending': return 'badge-review';
      case 'rejected': return 'badge-overdue';
      default: return 'badge-default';
    }
  }

  markNotificationAsRead(notificationId: number): void {
    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        const n = this.notifications.find(x => x.id === notificationId);
        if (n) n.is_read = true;
      },
      error: () => {}
    });
  }

  logout(): void {
    this.authService.logout();
  }
}

