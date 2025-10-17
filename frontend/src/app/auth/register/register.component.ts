import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { RoleService, Role } from '../../services/role.service';
import { RealEstateService } from '../../services/real-estate.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';
  availableRoles: Role[] = [];
  availableRealEstates: any[] = [];


  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private roleService: RoleService,
    private realEstateService: RealEstateService
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[\+]?[1-9][\d]{0,15}$/)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)]],
      confirmPassword: ['', [Validators.required]],
      roleId: ['', [Validators.required]],
      realEstateId: ['']
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    this.loadAvailableRoles();
    this.loadAvailableRealEstates();
  }

  loadAvailableRoles(): void {
    this.roleService.getRolesForRegistration().subscribe({
      next: (response) => {
        this.availableRoles = response.data;
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        // Fallback to hardcoded roles if API fails
        this.availableRoles = [
          { id: 4, name: 'client', description: 'Property Client - Purchase properties with installment plans', created_at: '' },
          { id: 3, name: 'seller', description: 'Real Estate Seller - Manage property sales and clients', created_at: '' }
        ];
      }
    });
  }

  loadAvailableRealEstates(): void {
    this.realEstateService.getAllRealEstates().subscribe({
      next: (response) => {
        this.availableRealEstates = response.data;
      },
      error: (error) => {
        console.error('Error loading real estates:', error);
        // Fallback to empty array if API fails
        this.availableRealEstates = [];
      }
    });
  }

  passwordMatchValidator(group: FormGroup): any {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formData = this.registerForm.value;
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        password: formData.password,
        roleId: parseInt(formData.roleId),
        realEstateId: parseInt(formData.realEstateId)
      };

      this.authService.register(userData).subscribe({
        next: (response: any) => {
          this.loading = false;
          this.successMessage = '¡Cuenta creada exitosamente! Ya puedes iniciar sesión.';
          this.registerForm.reset();

          // Redirect to login after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 2000);
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.error?.error || 'Error en el registro. Por favor intenta de nuevo.';
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.registerForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return `${this.getFieldLabel(fieldName)} es requerido`;
      }
      if (control.errors['email']) {
        return 'Por favor ingresa una dirección de correo válida';
      }
      if (control.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} debe tener al menos ${control.errors['minlength'].requiredLength} caracteres`;
      }
      if (control.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} no debe exceder ${control.errors['maxlength'].requiredLength} caracteres`;
      }
      if (control.errors['pattern']) {
        if (fieldName === 'password') {
          return 'La contraseña debe contener al menos una letra mayúscula, una minúscula y un número';
        }
        if (fieldName === 'phone') {
          return 'Por favor ingresa un número de teléfono válido';
        }
      }
      if (control.errors['passwordMismatch']) {
        return 'Las contraseñas no coinciden';
      }
    }
    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'Nombres',
      lastName: 'Apellidos',
      email: 'Correo electrónico',
      phone: 'Teléfono',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña',
      roleId: 'Rol',
      realEstateId: 'Empresa Inmobiliaria'
    };
    return labels[fieldName] || fieldName;
  }

  getSelectedRoleDescription(): string {
    const selectedRoleId = this.registerForm.get('roleId')?.value;
    if (selectedRoleId) {
      const role = this.availableRoles.find(r => r.id === parseInt(selectedRoleId));
      return role ? role.description : '';
    }
    return '';
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
