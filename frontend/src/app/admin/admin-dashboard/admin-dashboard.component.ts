import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
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
        description: 'New real estate company registered',
        timestamp: new Date()
      },
      {
        description: 'New client added to system',
        timestamp: new Date(Date.now() - 3600000)
      },
      {
        description: 'Property listing updated',
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
