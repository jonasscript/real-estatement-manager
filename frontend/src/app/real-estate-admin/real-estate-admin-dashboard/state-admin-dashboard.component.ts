import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RealEstateService } from '../../services/real-estate.service';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CreationWizardComponent } from '../../admin/creation-wizard/creation-wizard.component';

interface MonthlySalesMetric {
  month_number: number;
  month_key: string;
  sales_count: number | string;
  sales_amount: number | string;
  color?: string;
}

interface StatusMetric {
  status_name: string;
  status_color: string;
  count: number | string;
  amount: number | string;
}

interface SellerMetric {
  id: number;
  seller_name: string;
  email: string;
  commission_rate: number | string;
  is_active: boolean;
  clients_count: number | string;
  sales_count: number | string;
  total_sales_amount: number | string;
  total_down_payments: number | string;
  estimated_commission: number | string;
}

interface TopModelMetric {
  model_name: string;
  sales_count: number | string;
  sales_amount: number | string;
}

interface RealEstateDashboardData {
  id: number;
  name: string;
  property_count: number | string;
  property_model_count: number | string;
  inventory_value: number | string;
  available_properties_count: number | string;
  reserved_properties_count: number | string;
  sold_properties_count: number | string;
  available_inventory_value: number | string;
  client_count: number | string;
  signed_contracts_count: number | string;
  seller_count: number | string;
  active_seller_count: number | string;
  purchase_count: number | string;
  total_sales_amount: number | string;
  total_down_payments: number | string;
  approved_payments_amount: number | string;
  pending_payments_count: number | string;
  overdue_installments_count: number | string;
  total_remaining_balance: number | string;
  monthly_sales: MonthlySalesMetric[];
  status_distribution: StatusMetric[];
  seller_performance: SellerMetric[];
  top_models: TopModelMetric[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, DialogModule, ButtonModule, CreationWizardComponent],
  templateUrl: './state-admin-dashboard.component.html',
  styleUrls: ['./state-admin-dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: any = null;
  realEstateData: RealEstateDashboardData | null = null;
  loading = false;
  showWizardModal = false;

  monthlySalesData: MonthlySalesMetric[] = [];
  statusDistribution: StatusMetric[] = [];
  sellerPerformance: SellerMetric[] = [];
  topModels: TopModelMetric[] = [];

  private readonly chartColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#7c3aed', '#0891b2'];
  private readonly monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

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

    const currentUser = this.authService.currentUser;
    if (!currentUser?.real_estate_id) {
      console.error('User does not have a real estate assigned');
      this.loading = false;
      return;
    }

    this.realEstateService.getRealEstateStatistics(currentUser.real_estate_id)
      .subscribe({
        next: (response) => {
          this.realEstateData = response.data as RealEstateDashboardData;
          this.prepareDashboardCollections();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading real estate data:', error);
          this.loading = false;

          if (error.status === 401) {
            this.authService.logout();
            this.router.navigate(['/auth/login']);
          }
        }
      });
  }

  prepareDashboardCollections(): void {
    const data = this.realEstateData;
    this.monthlySalesData = (data?.monthly_sales || []).map((item, index) => ({
      ...item,
      color: this.chartColors[index % this.chartColors.length]
    }));
    this.statusDistribution = data?.status_distribution || [];
    this.sellerPerformance = data?.seller_performance || [];
    this.topModels = data?.top_models || [];
  }

  toNumber(value: number | string | null | undefined): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  getTotalProperties(): number {
    return this.toNumber(this.realEstateData?.property_count);
  }

  getTotalClients(): number {
    return this.toNumber(this.realEstateData?.client_count);
  }

  getTotalSignedContracts(): number {
    return this.toNumber(this.realEstateData?.signed_contracts_count);
  }

  getTotalDownPayments(): number {
    return this.toNumber(this.realEstateData?.total_down_payments);
  }

  getTotalRemainingBalance(): number {
    return this.toNumber(this.realEstateData?.total_remaining_balance);
  }

  getTotalSalesAmount(): number {
    return this.toNumber(this.realEstateData?.total_sales_amount);
  }

  getInventoryValue(): number {
    return this.toNumber(this.realEstateData?.inventory_value);
  }

  getApprovedPaymentsAmount(): number {
    return this.toNumber(this.realEstateData?.approved_payments_amount);
  }

  getSalesProgress(): number {
    return this.getPercentage(this.realEstateData?.purchase_count, this.realEstateData?.property_count);
  }

  getCollectionProgress(): number {
    return this.getPercentage(this.realEstateData?.approved_payments_amount, this.realEstateData?.total_down_payments);
  }

  getContractConversion(): number {
    return this.getPercentage(this.realEstateData?.signed_contracts_count, this.realEstateData?.client_count);
  }

  getAverageTicket(): number {
    const purchaseCount = this.toNumber(this.realEstateData?.purchase_count);
    return purchaseCount > 0 ? this.getTotalSalesAmount() / purchaseCount : 0;
  }

  getMaxMonthlySales(): number {
    const maxSales = Math.max(...this.monthlySalesData.map(item => this.toNumber(item.sales_amount)), 0);
    return maxSales || 1;
  }

  getMaxSellerSales(): number {
    const maxSales = Math.max(...this.sellerPerformance.map(item => this.toNumber(item.total_sales_amount)), 0);
    return maxSales || 1;
  }

  getSalesBarWidth(item: MonthlySalesMetric): number {
    return this.getBarWidth(this.toNumber(item.sales_amount), this.getMaxMonthlySales());
  }

  getSellerBarWidth(item: SellerMetric): number {
    return this.getBarWidth(this.toNumber(item.total_sales_amount), this.getMaxSellerSales());
  }

  getStatusPercent(item: StatusMetric): number {
    return this.getPercentage(item.count, this.realEstateData?.property_count);
  }

  getModelPercent(item: TopModelMetric): number {
    return this.getPercentage(item.sales_amount, this.realEstateData?.total_sales_amount);
  }

  getMonthLabel(item: MonthlySalesMetric): string {
    const index = this.toNumber(item.month_number) - 1;
    return this.monthNames[index] || item.month_key;
  }

  getSellerInitials(seller: SellerMetric): string {
    return (seller.seller_name || seller.email || 'NA')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('');
  }

  getPaymentRiskLabel(): string {
    const overdue = this.toNumber(this.realEstateData?.overdue_installments_count);
    const pending = this.toNumber(this.realEstateData?.pending_payments_count);

    if (overdue > 0) {
      return `${overdue} cuota(s) vencida(s) requieren seguimiento`;
    }

    if (pending > 0) {
      return `${pending} pago(s) pendiente(s) por aprobar`;
    }

    return 'Cobranza al dia';
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

  navigateToSellers(): void {
    this.router.navigate(['/real-estate-admin/sellers']);
  }

  navigateToPayments(): void {
    this.router.navigate(['/real-estate-admin/payments']);
  }

  openWizardModal(): void {
    this.showWizardModal = true;
  }

  onWizardComplete(): void {
    this.showWizardModal = false;
    this.loadRealEstateData();
  }

  trackByMonth(index: number, item: MonthlySalesMetric): string {
    return item.month_key || index.toString();
  }

  trackByStatus(index: number, item: StatusMetric): string {
    return item.status_name || index.toString();
  }

  trackBySeller(index: number, item: SellerMetric): number {
    return item.id || index;
  }

  trackByModel(index: number, item: TopModelMetric): string {
    return item.model_name || index.toString();
  }

  logout(): void {
    this.authService.logout();
  }

  private getPercentage(value: number | string | null | undefined, total: number | string | null | undefined): number {
    const totalValue = this.toNumber(total);
    if (totalValue <= 0) {
      return 0;
    }

    return Math.round((this.toNumber(value) / totalValue) * 100);
  }

  private getBarWidth(value: number, maxValue: number): number {
    if (maxValue <= 0 || value <= 0) {
      return 0;
    }

    return Math.min(Math.max((value / maxValue) * 100, 4), 100);
  }
}
