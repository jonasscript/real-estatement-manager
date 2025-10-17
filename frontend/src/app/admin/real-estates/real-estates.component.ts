import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RealEstateService, RealEstate } from '../../services/real-estate.service';

@Component({
  selector: 'app-real-estates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './real-estates.component.html',
  styleUrls: ['./real-estates.component.scss']
})
export class RealEstatesComponent implements OnInit {
  realEstates: RealEstate[] = [];
  loading = false;
  showCreateForm = false;
  editingRealEstate: RealEstate | null = null;

  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private realEstateService: RealEstateService,
    private fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      country: ['', [Validators.required]],
      phone: [''],
      email: ['', [Validators.email]]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      country: ['', [Validators.required]],
      phone: [''],
      email: ['', [Validators.email]]
    });
  }

  ngOnInit(): void {
    this.loadRealEstates();
  }

  loadRealEstates(): void {
    this.loading = true;
    this.realEstateService.getAllRealEstates()
      .subscribe({
        next: (response) => {
          this.realEstates = response.data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading real estates:', error);
          this.loading = false;
        }
      });
  }

  onCreate(): void {
    if (this.createForm.valid) {
      this.loading = true;
      this.realEstateService.createRealEstate(this.createForm.value)
        .subscribe({
          next: (response) => {
            this.realEstates.unshift(response.data);
            this.createForm.reset();
            this.showCreateForm = false;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error creating real estate:', error);
            this.loading = false;
          }
        });
    }
  }

  onEdit(realEstate: RealEstate): void {
    this.editingRealEstate = realEstate;
    this.editForm.patchValue({
      name: realEstate.name,
      address: realEstate.address,
      city: realEstate.city,
      country: realEstate.country,
      phone: realEstate.phone || '',
      email: realEstate.email || ''
    });
  }

  onUpdate(): void {
    if (this.editForm.valid && this.editingRealEstate) {
      this.loading = true;
      this.realEstateService.updateRealEstate(this.editingRealEstate!.id, this.editForm.value)
        .subscribe({
          next: (response) => {
            const index = this.realEstates.findIndex(re => re.id === this.editingRealEstate!.id);
            if (index !== -1) {
              this.realEstates[index] = response.data;
            }
            this.editingRealEstate = null;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error updating real estate:', error);
            this.loading = false;
          }
        });
    }
  }

  onDelete(realEstate: RealEstate): void {
    if (confirm(`Are you sure you want to delete "${realEstate.name}"?`)) {
      this.loading = true;
      this.realEstateService.deleteRealEstate(realEstate.id)
        .subscribe({
          next: () => {
            this.realEstates = this.realEstates.filter(re => re.id !== realEstate.id);
            this.loading = false;
          },
          error: (error) => {
            console.error('Error deleting real estate:', error);
            this.loading = false;
          }
        });
    }
  }

  cancelEdit(): void {
    this.editingRealEstate = null;
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.createForm.reset();
    }
  }
}
