import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  // Default redirect
  { path: '', redirectTo: '/auth/login', pathMatch: 'full' },

  // Authentication routes
  {
    path: 'auth',
    children: [
      { path: 'login', loadComponent: () => import('./auth/login/login.component').then(m => m.LoginComponent) },
      { path: 'register', loadComponent: () => import('./auth/register/register.component').then(m => m.RegisterComponent) }
    ]
  },

  // System Admin routes
  {
    path: 'admin',
    canActivate: [AuthGuard],
    data: { roles: ['system_admin'] },
    children: [
      { path: 'dashboard', loadComponent: () => import('./admin/admin-dashboard/admin-dashboard.component').then(m => m.DashboardComponent) },
      { path: 'real-estates', loadComponent: () => import('./admin/real-estates/real-estates.component').then(m => m.RealEstatesComponent) },
      { path: 'users', loadComponent: () => import('./admin/users/users.component').then(m => m.UsersComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Real Estate Admin routes
  {
    path: 'real-estate-admin',
    canActivate: [AuthGuard],
    data: { roles: ['real_estate_admin'] },
    children: [
      { path: 'dashboard', loadComponent: () => import('./real-estate-admin/real-estate-admin-dashboard/state-admin-dashboard.component').then(m => m.DashboardComponent) },
      { path: 'properties', loadComponent: () => import('./real-estate-admin/properties/properties.component').then(m => m.PropertiesComponent) },
      { path: 'clients', loadComponent: () => import('./real-estate-admin/clients/clients.component').then(m => m.ClientsComponent) },
      { path: 'sellers', loadComponent: () => import('./real-estate-admin/sellers/sellers.component').then(m => m.SellersComponent) },
      { path: 'users', loadComponent: () => import('./real-estate-admin/users/users.component').then(m => m.UsersComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Seller routes
  {
    path: 'seller',
    canActivate: [AuthGuard],
    data: { roles: ['seller'] },
    children: [
      { path: 'dashboard', loadComponent: () => import('./seller/seller-dashboard/seller-dashboard.component').then(m => m.DashboardComponent) },
      { path: 'clients', loadComponent: () => import('./client/client-dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent) },
      { path: 'payments', loadComponent: () => import('./seller/payments/payments.component').then(m => m.PaymentsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Client routes
  {
    path: 'client',
    canActivate: [AuthGuard],
    data: { roles: ['client'] },
    children: [
      { path: 'dashboard', loadComponent: () => import('./client/client-dashboard/client-dashboard.component').then(m => m.ClientDashboardComponent) },
      { path: 'payments', loadComponent: () => import('./client/payments/payments.component').then(m => m.PaymentsComponent) },
      { path: 'installments', loadComponent: () => import('./client/installments/installments.component').then(m => m.InstallmentsComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Wildcard route
  { path: '**', redirectTo: '/auth/login' }
];
