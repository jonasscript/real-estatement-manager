import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CRON_JOB_TYPE_OPTIONS,
  CronConfiguration,
  CronConfigurationPayload,
  CronConfigurationService,
  CronFrequency,
  CronJobType,
} from '../../services/cron-configuration.service';
import { AuthService } from '../../services/auth.service';
import { RealEstate, RealEstateService } from '../../services/real-estate.service';

@Component({
  selector: 'app-cron-configurations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cron-configurations.component.html',
  styleUrls: ['./cron-configurations.component.scss'],
})
export class CronConfigurationsComponent implements OnInit {
  configurations: CronConfiguration[] = [];
  loading = false;
  saving = false;
  error = '';
  editingId: number | null = null;

  isSystemAdmin = false;
  realEstates: RealEstate[] = [];
  selectedRealEstateId: number | null = null;

  readonly jobTypeOptions = CRON_JOB_TYPE_OPTIONS;

  readonly weekDays = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
  ];

  form: CronConfigurationPayload = this.emptyForm();

  constructor(
    private readonly cronConfigurationService: CronConfigurationService,
    private readonly authService: AuthService,
    private readonly realEstateService: RealEstateService,
  ) {}

  ngOnInit(): void {
    this.isSystemAdmin = this.authService.currentUser?.role_name === 'system_admin';
    if (this.isSystemAdmin) {
      this.loadRealEstates();
    } else {
      this.loadConfigurations();
    }
  }

  loadRealEstates(): void {
    this.loading = true;
    this.realEstateService.getAll().subscribe({
      next: (res) => {
        this.realEstates = res.data ?? [];
        this.loading = false;
        if (this.realEstates.length > 0) {
          this.selectedRealEstateId = this.realEstates[0].id;
          this.loadConfigurations();
        }
      },
      error: (err) => {
        this.error = err?.error?.error || 'No se pudieron cargar las ciudadelas';
        this.loading = false;
      },
    });
  }

  onRealEstateChange(): void {
    this.resetForm();
    this.loadConfigurations();
  }

  loadConfigurations(): void {
    if (this.isSystemAdmin && !this.selectedRealEstateId) {
      this.configurations = [];
      return;
    }
    this.loading = true;
    this.cronConfigurationService.getConfigurations(this.selectedRealEstateId).subscribe({
      next: (res) => {
        this.configurations = res.data ?? [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'No se pudieron cargar las configuraciones de cron';
        this.loading = false;
      },
    });
  }

  save(): void {
    this.error = '';
    if (!this.form.name.trim()) {
      this.error = 'El nombre es requerido';
      return;
    }
    if (this.form.frequency === 'weekly' && (this.form.dayOfWeek === null || this.form.dayOfWeek === undefined)) {
      this.error = 'Selecciona el día de la semana';
      return;
    }
    if (this.form.frequency === 'monthly' && (this.form.dayOfMonth === null || this.form.dayOfMonth === undefined)) {
      this.error = 'Selecciona el día del mes';
      return;
    }
    if (!this.form.notifyEmail && !this.form.notifyWhatsapp) {
      this.error = 'Selecciona al menos un canal de notificación (Email o WhatsApp)';
      return;
    }
    if (this.isSystemAdmin && !this.selectedRealEstateId) {
      this.error = 'Selecciona una ciudadela';
      return;
    }
    if (this.isSystemAdmin) {
      this.form.realEstateId = this.selectedRealEstateId;
    }

    this.saving = true;
    const request = this.editingId
      ? this.cronConfigurationService.updateConfiguration(this.editingId, this.form)
      : this.cronConfigurationService.createConfiguration(this.form);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.resetForm();
        this.loadConfigurations();
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.error || 'No se pudo guardar la configuración de cron';
      },
    });
  }

  edit(configuration: CronConfiguration): void {
    this.editingId = configuration.id;
    this.form = {
      name: configuration.name,
      description: configuration.description || '',
      jobType: configuration.job_type,
      frequency: configuration.frequency,
      dayOfWeek: configuration.day_of_week,
      dayOfMonth: configuration.day_of_month,
      timeOfDay: configuration.time_of_day?.slice(0, 5) || '08:00',
      isActive: configuration.is_active,
      notifyEmail: configuration.notify_email,
      notifyWhatsapp: configuration.notify_whatsapp,
      realEstateId: configuration.real_estate_id,
    };
  }

  remove(configuration: CronConfiguration): void {
    if (!confirm(`Eliminar la configuración "${configuration.name}"?`)) return;
    this.cronConfigurationService.deleteConfiguration(configuration.id).subscribe({
      next: () => this.loadConfigurations(),
      error: (err) => this.error = err?.error?.error || 'No se pudo eliminar la configuración',
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.form = this.emptyForm();
  }

  frequencyLabel(frequency: CronFrequency): string {
    return { daily: 'Diaria', weekly: 'Semanal', monthly: 'Mensual' }[frequency];
  }

  scheduleSummary(configuration: CronConfiguration): string {
    const time = configuration.time_of_day?.slice(0, 5) || '';
    if (configuration.frequency === 'weekly') {
      const day = this.weekDays.find(d => d.value === configuration.day_of_week)?.label || '';
      return `Cada ${day} a las ${time}`;
    }
    if (configuration.frequency === 'monthly') {
      return `Día ${configuration.day_of_month} de cada mes a las ${time}`;
    }
    return `Todos los días a las ${time}`;
  }

  jobTypeLabel(jobType: CronJobType): string {
    return this.jobTypeOptions.find(o => o.value === jobType)?.label || jobType;
  }

  notificationChannelsLabel(configuration: CronConfiguration): string {
    const channels: string[] = [];
    if (configuration.notify_email) channels.push('Email');
    if (configuration.notify_whatsapp) channels.push('WhatsApp');
    return channels.length ? channels.join(' + ') : 'Sin canal';
  }

  private emptyForm(): CronConfigurationPayload {
    return {
      name: '',
      description: '',
      jobType: 'PAYMENT_REMINDER',
      frequency: 'daily',
      dayOfWeek: null,
      dayOfMonth: null,
      timeOfDay: '08:00',
      isActive: true,
      notifyEmail: false,
      notifyWhatsapp: false,
      realEstateId: this.selectedRealEstateId,
    };
  }
}
