import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RealEstateService } from '../../services/real-estate.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './state-admin-dashboard.component.html',
  styleUrls: ['./state-admin-dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: any = null;
  realEstateData: any = null;
  loading = false;

  monthlySalesData = [
    { month: 'Ene', sales: 180000, color: '#ff8f6b' },
    { month: 'Feb', sales: 145000, color: '#5b93ff' },
    { month: 'Mar', sales: 220000, color: '#ff8f6b' },
    { month: 'Abr', sales: 195000, color: '#5b93ff' },
    { month: 'May', sales: 135000, color: '#5b93ff' },
    { month: 'Jun', sales: 210000, color: '#ff8f6b' },
    { month: 'Jul', sales: 175000, color: '#5b93ff' }
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly realEstateService: RealEstateService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.loadRealEstateData();
  }

  loadRealEstateData(): void {
    this.loading = true;
    
    // Get the current user's real estate ID from session storage
    const currentUser = this.authService.currentUser;
    if (!currentUser?.real_estate_id) {
      console.error('User does not have a real estate assigned');
      this.loading = false;
      return;
    }

    this.realEstateService.getRealEstateStatistics(currentUser.real_estate_id)
      .subscribe({
        next: (response) => {
          this.realEstateData = response.data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading real estate data:', error);
          this.loading = false;
          
          // Handle unauthorized access
          if (error.status === 401) {
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          }
        }
      });
  }

  getTotalProperties(): number {
    return this.realEstateData ? this.realEstateData.property_count || 0 : 0;
  }

  getTotalClients(): number {
    return this.realEstateData ? this.realEstateData.client_count || 0 : 0;
  }

  getTotalSignedContracts(): number {
    return this.realEstateData ? this.realEstateData.signed_contracts_count || 0 : 0;
  }

  getTotalDownPayments(): number {
    return this.realEstateData ? Number.parseFloat(this.realEstateData.total_down_payments?.toString() || '0') : 0;
  }

  getTotalRemainingBalance(): number {
    return this.realEstateData ? Number.parseFloat(this.realEstateData.total_remaining_balance?.toString() || '0') : 0;
  }

  navigateToProperties(): void {
    const realEstateId = this.currentUser?.real_estate_id;
    if (realEstateId) {
      this.router.navigate(['/real-estate-admin/properties'], {
        queryParams: { realEstateId }
      });
    }
  }

  navigateToClients(): void {
    const realEstateId = this.currentUser?.real_estate_id;
    if (realEstateId) {
      this.router.navigate(['/real-estate-admin/clients'], {
        queryParams: { realEstateId }
      });
    }
  }

  getMaxSales(): number {
    return Math.max(...this.monthlySalesData.map(item => item.sales));
  }

  logout(): void {
    this.authService.logout();
  }
}
