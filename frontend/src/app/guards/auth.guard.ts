import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
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
  ): boolean | UrlTree {
    const userDataStr = sessionStorage.getItem('user');
    const currentUrl = state.url;

    // Verificar si hay sesión activa
    let hasActiveSession = false;
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        hasActiveSession = !!userData?.id;
      } catch {
        hasActiveSession = false;
      }
    }

    // Si está navegando a rutas de autenticación (login/register)
    const isAuthRoute = currentUrl.startsWith('/auth');

    if (isAuthRoute) {
      // Si hay sesión activa, redirigir a /
      if (hasActiveSession) {
        return this.router.createUrlTree(['/']);
      }
      // No hay sesión, permitir acceso a login/register
      return true;
    }

    // Para rutas protegidas (no auth), verificar sesión
    if (!hasActiveSession) {
      return this.router.createUrlTree(['/auth/login']);
    }

    // Sesión existe, permitir navegación
    return true;
  }
}
