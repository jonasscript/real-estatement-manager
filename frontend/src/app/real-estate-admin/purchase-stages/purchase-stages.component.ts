import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PurchaseStageDefinition,
  PurchaseStagePayload,
  PurchaseStageService,
  StageValueType,
} from '../../services/purchase-stage.service';

@Component({
  selector: 'app-purchase-stages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './purchase-stages.component.html',
  styleUrls: ['./purchase-stages.component.scss'],
})
export class PurchaseStagesComponent implements OnInit {
  definitions: PurchaseStageDefinition[] = [];
  loading = false;
  saving = false;
  error = '';
  editingId: number | null = null;

  form: PurchaseStagePayload = this.emptyForm();

  constructor(private readonly purchaseStageService: PurchaseStageService) {}

  ngOnInit(): void {
    this.loadDefinitions();
  }

  loadDefinitions(): void {
    this.loading = true;
    this.purchaseStageService.getDefinitions().subscribe({
      next: (res) => {
        this.definitions = res.data ?? [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'No se pudieron cargar las fases';
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
    this.saving = true;
    const request = this.editingId
      ? this.purchaseStageService.updateDefinition(this.editingId, this.form)
      : this.purchaseStageService.createDefinition(this.form);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.resetForm();
        this.loadDefinitions();
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.error || 'No se pudo guardar la fase';
      },
    });
  }

  edit(definition: PurchaseStageDefinition): void {
    this.editingId = definition.id;
    this.form = {
      name: definition.name,
      description: definition.description || '',
      sortOrder: definition.sort_order,
      valueType: definition.value_type,
      value: Number(definition.value),
      requiresPayment: definition.requires_payment,
      requiresApproval: definition.requires_approval,
      blocksNextStage: definition.blocks_next_stage,
      isActive: definition.is_active,
    };
  }

  disable(definition: PurchaseStageDefinition): void {
    if (!confirm(`Desactivar la fase "${definition.name}"?`)) return;
    this.purchaseStageService.deleteDefinition(definition.id).subscribe({
      next: () => this.loadDefinitions(),
      error: (err) => this.error = err?.error?.error || 'No se pudo desactivar la fase',
    });
  }

  resetForm(): void {
    this.editingId = null;
    this.form = this.emptyForm();
  }

  valueTypeLabel(type: StageValueType): string {
    return type === 'percentage' ? '% del precio' : 'Monto fijo';
  }

  private emptyForm(): PurchaseStagePayload {
    return {
      name: '',
      description: '',
      sortOrder: 1,
      valueType: 'fixed_amount',
      value: 0,
      requiresPayment: true,
      requiresApproval: true,
      blocksNextStage: true,
      isActive: true,
    };
  }
}
