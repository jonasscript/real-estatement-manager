import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {

    // Check if user has token in session storage
    const token = sessionStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    // Token exists, allow navigation
    return true;
  }
}
