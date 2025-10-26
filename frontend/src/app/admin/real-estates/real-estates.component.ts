import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RealEstateService, RealEstate } from '../../services/real-estate.service';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-real-estates',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule],
  templateUrl: './real-estates.component.html',
  styleUrls: ['./real-estates.component.scss']
})
export class RealEstatesComponent implements OnInit {
  realEstates: RealEstate[] = [];
  loading = false;
  showCreateDialog = false;
  editingRealEstate: RealEstate | null = null;
  showEditDialog = false;

  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private readonly realEstateService: RealEstateService,
    private readonly fb: FormBuilder
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
            this.showCreateDialog = false;
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
    this.showEditDialog = true;
  }

  onUpdate(): void {
    if (this.editForm.valid && this.editingRealEstate) {
      this.loading = true;
      this.realEstateService.updateRealEstate(this.editingRealEstate.id, this.editForm.value)
        .subscribe({
          next: (response) => {
            const index = this.realEstates.findIndex(re => re.id === this.editingRealEstate?.id);
            if (index !== -1) {
              this.realEstates[index] = response.data;
            }
            this.editingRealEstate = null;
            this.showEditDialog = false;
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
    this.showEditDialog = false;
    this.editForm.reset();
  }

  toggleCreateForm(): void {
    this.showCreateDialog = !this.showCreateDialog;
    if (!this.showCreateDialog) {
      this.createForm.reset();
    }
  }

  cancelCreate(): void {
    this.showCreateDialog = false;
    this.createForm.reset();
  }

  getUniqueCountries(): number {
    const countries = new Set(this.realEstates.map(re => re.country));
    return countries.size;
  }

  getUniqueCities(): number {
    const cities = new Set(this.realEstates.map(re => re.city));
    return cities.size;
  }

  getUniqueCountriesList(): string[] {
    const countries = new Set(this.realEstates.map(re => re.country).filter(country => country != null));
    return Array.from(countries).sort((a, b) => a.localeCompare(b));
  }
}
