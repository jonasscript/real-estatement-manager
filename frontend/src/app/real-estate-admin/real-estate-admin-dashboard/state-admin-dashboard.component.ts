import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RealEstateService, RealEstateStats } from '../../services/real-estate.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './state-admin-dashboard.component.html',
  styleUrls: ['./state-admin-dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: any = null;
  realEstates: RealEstateStats[] = [];
  loading = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly realEstateService: RealEstateService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.loadRealEstates();
  }

  loadRealEstates(): void {
    this.loading = true;
    this.realEstateService.getAllRealEstatesStatistics()
      .subscribe({
        next: (response) => {
          this.realEstates = response.data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading real estates:', error);
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
    return this.realEstates.reduce((sum, re) => sum + re.property_count, 0);
  }

  getTotalClients(): number {
    return this.realEstates.reduce((sum, re) => sum + re.client_count, 0);
  }

  getTotalSignedContracts(): number {
    return this.realEstates.reduce((sum, re) => sum + re.signed_contracts_count, 0);
  }

  getTotalDownPayments(): number {
    return this.realEstates.reduce((sum, re) => sum + Number.parseFloat(re.total_down_payments.toString()), 0);
  }

  getTotalRemainingBalance(): number {
    return this.realEstates.reduce((sum, re) => sum + Number.parseFloat(re.total_remaining_balance.toString()), 0);
  }

  navigateToProperties(realEstateId: number): void {
    this.router.navigate(['/real-estate-admin/properties'], {
      queryParams: { realEstateId }
    });
  }

  navigateToClients(realEstateId: number): void {
    this.router.navigate(['/real-estate-admin/clients'], {
      queryParams: { realEstateId }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
