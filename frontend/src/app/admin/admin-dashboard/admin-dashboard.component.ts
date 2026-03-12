import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  stats = {
    realEstates: 0,
    totalUsers: 0,
    totalProperties: 0,
    totalClients: 0
  };
  recentActivities: any[] = [];
  monthlyData = [
    { month: 'Ene', value: 23400, color: '#ff8f6b' },
    { month: 'Feb', value: 15000, color: '#5b93ff' },
    { month: 'Mar', value: 30000, color: '#ff8f6b' },
    { month: 'Abr', value: 22000, color: '#5b93ff' },
    { month: 'May', value: 10000, color: '#5b93ff' },
    { month: 'Jun', value: 23400, color: '#ff8f6b' },
    { month: 'Jul', value: 5000, color: '#5b93ff' }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUser;
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    // TODO: Implement API calls to load dashboard statistics
    // For now, using mock data
    this.stats = {
      realEstates: 5,
      totalUsers: 150,
      totalProperties: 45,
      totalClients: 120
    };

    this.recentActivities = [
      {
        description: 'Nueva inmobiliaria registrada',
        timestamp: new Date()
      },
      {
        description: 'Cliente agregado al sistema',
        timestamp: new Date(Date.now() - 3600000)
      },
      {
        description: 'Propiedad actualizada en el listado',
        timestamp: new Date(Date.now() - 7200000)
      }
    ];
  }

  viewReports(): void {
    // TODO: Navigate to reports page
    console.log('View reports clicked');
  }

  logout(): void {
    this.authService.logout();
  }
}
