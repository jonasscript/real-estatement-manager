import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home-redirect',
  standalone: true,
  template: ''
})
export class HomeRedirectComponent implements OnInit {
  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    const userData = sessionStorage.getItem('user');
    
    if (!userData) {
      // No hay sesión, ir a login
      this.router.navigate(['/auth/login']);
      return;
    }

    try {
      const user = JSON.parse(userData);
      const roleId = user.roleId;

      // Redirigir según el rol
      switch (roleId) {
        case 1: // system_admin
          this.router.navigate(['/admin/dashboard']);
          break;
        case 2: // real_estate_admin
          this.router.navigate(['/real-estate-admin/dashboard']);
          break;
        case 3: // seller
          this.router.navigate(['/seller/dashboard']);
          break;
        case 4: // client
          this.router.navigate(['/client/dashboard']);
          break;
        default:
          this.router.navigate(['/auth/login']);
      }
    } catch {
      // Error parseando, ir a login
      this.router.navigate(['/auth/login']);
    }
  }
}
