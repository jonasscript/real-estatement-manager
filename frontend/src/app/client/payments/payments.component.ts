import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

interface Payment {
  id: number;
  installment_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string;
  notes?: string;
  proof_file_path?: string;
}

interface Installment {
  id: number;
  installment_number: number;
  amount: number;
  due_date: string;
  status: string;
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
  installments: Installment[] = [];
  loading = false;
  selectedFile: File | null = null;

  private readonly API_URL = 'http://localhost:3000/api';

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.loadPayments();
    this.loadInstallments();
  }

  loadPayments(): void {
    this.http.get<{ data: Payment[] }>(`${this.API_URL}/clients/payments`)
      .subscribe({
        next: (response) => {
          this.payments = response.data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading payments:', error);
          this.loading = false;
        }
      });
  }

  loadInstallments(): void {
    this.http.get<{ data: Installment[] }>(`${this.API_URL}/clients/installments`)
      .subscribe({
        next: (response) => {
          this.installments = response.data;
        },
        error: (error) => {
          console.error('Error loading installments:', error);
        }
      });
  }

  getPendingInstallments(): Installment[] {
    return this.installments.filter(inst => inst.status === 'pending');
  }

  getPaidInstallments(): Installment[] {
    return this.installments.filter(inst => inst.status === 'paid');
  }

  getOverdueInstallments(): Installment[] {
    return this.installments.filter(inst => inst.status === 'overdue' || inst.status === 'late');
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'approved': return 'status-approved';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      case 'paid': return 'status-paid';
      case 'overdue': return 'status-overdue';
      case 'late': return 'status-late';
      default: return 'status-default';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending';
      case 'rejected': return 'Rejected';
      case 'paid': return 'Paid';
      case 'overdue': return 'Overdue';
      case 'late': return 'Late';
      default: return 'Unknown';
    }
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0];
  }

  uploadPaymentProof(installmentId: number): void {
    if (!this.selectedFile) {
      alert('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('proof', this.selectedFile);
    formData.append('installmentId', installmentId.toString());
    formData.append('paymentMethod', 'bank_transfer'); // Default method

    this.http.post(`${this.API_URL}/clients/upload-payment`, formData)
      .subscribe({
        next: (response) => {
          alert('Payment proof uploaded successfully');
          this.loadPayments(); // Refresh payments
          this.selectedFile = null;
        },
        error: (error) => {
          console.error('Error uploading payment proof:', error);
          alert('Error uploading payment proof');
        }
      });
  }

  logout(): void {
    this.authService.logout();
  }
}
