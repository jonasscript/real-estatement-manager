import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.error = null;

      const { email, password } = this.loginForm.value;

      this.authService.login({ email, password }).subscribe({
        next: (response) => {
          this.loading = false;
          // Navigate based on user role
          const user = response.data.user;
          this.redirectBasedOnRole(user.roleName);
        },
        error: (error) => {
          this.loading = false;
          this.error = error.message || 'Credenciales inválidas. Por favor verifica tu correo y contraseña.';
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  private redirectBasedOnRole(role: string): void {
    switch (role) {
      case 'system_admin':
        this.router.navigate(['/admin/dashboard']);
        break;
      case 'real_estate_admin':
        this.router.navigate(['/real-estate-admin/dashboard']);
        break;
      case 'seller':
        this.router.navigate(['/seller/dashboard']);
        break;
      case 'client':
        this.router.navigate(['/client/dashboard']);
        break;
      default:
        this.router.navigate(['/']);
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
