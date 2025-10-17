import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';

interface MenuOption {
    id: number;
    name: string;
    label: string;
    path: string;
    icon: string;
    parent_id?: number;
    sort_order: number;
    children?: MenuOption[];
}

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
    currentUser: any = null;
    menuOptions: MenuOption[] = [];
    loading = false;
    private userSubscription?: Subscription;

    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    ngOnInit(): void {
        // Subscribe to user changes
        this.userSubscription = this.authService.currentUser$.subscribe(user => {
            this.currentUser = user;
            
            // Load menu when user changes (login/logout)
            if (user) {
                this.loadMenuOptions();
            } else {
                this.menuOptions = []; // Clear menu when user logs out
            }
        });
    }

    ngOnDestroy(): void {
        if (this.userSubscription) {
            this.userSubscription.unsubscribe();
        }
    }

    loadMenuOptions(): void {
        this.loading = true;
        this.authService.getMenuOptions().subscribe({
            next: (response) => {
                // Handle both cached response and API response formats
                this.menuOptions = response?.data || response || [];
                this.loading = false;
            },
            error: (error) => {
                console.error('Error loading menu options:', error);
                this.menuOptions = []; // Set empty array on error
                this.loading = false;
            }
        });
    }

    logout(): void {
        this.authService.logout();
    }

    // Method to refresh menu options (useful when permissions change)
    refreshMenu(): void {
        this.loading = true;
        this.authService.refreshMenuOptions().subscribe({
            next: (response) => {
                this.menuOptions = response?.data || response || [];
                this.loading = false;
            },
            error: (error) => {
                console.error('Error refreshing menu options:', error);
                this.menuOptions = [];
                this.loading = false;
            }
        });
    }

    getIconClass(icon: string): string {
        // Map icon names to CSS classes (you can customize this)
        const iconMap: { [key: string]: string } = {
            'dashboard': 'fas fa-tachometer-alt',
            'building': 'fas fa-building',
            'users': 'fas fa-users',
            'home': 'fas fa-home',
            'credit-card': 'fas fa-credit-card',
            'calendar': 'fas fa-calendar'
        };

        return iconMap[icon] || 'fas fa-circle';
    }

    // TrackBy function for better performance in *ngFor
    trackByMenuId(index: number, menu: MenuOption): number {
        return menu.id;
    }
}