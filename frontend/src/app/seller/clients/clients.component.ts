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

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnInit {
  currentUser: any = null;
  assignedClients: Client[] = [];
  allClients: Client[] = [];
  loading = false;
  activeTab: 'assigned' | 'all' = 'assigned';

  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.loadClients();
  }

  loadClients(): void {
    this.loading = true;
    if (this.activeTab === 'assigned') {
      this.loadAssignedClients();
    } else {
      this.loadAllClients();
    }
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
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading all clients:', error);
          this.loading = false;
        }
      });
  }

  switchTab(tab: 'assigned' | 'all'): void {
    this.activeTab = tab;
    this.loadClients();
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

  getCurrentClients(): Client[] {
    return this.activeTab === 'assigned' ? this.assignedClients : this.allClients;
  }

  logout(): void {
    this.authService.logout();
  }
}
