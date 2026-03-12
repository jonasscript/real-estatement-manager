import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { NavbarComponent } from './shared/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'Real Estate Installment System';
  showNavbar = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Show navbar only when user is authenticated
    this.authService.currentUser$.subscribe(user => {
      this.showNavbar = !!user;
    });
  }
}
