import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-microsoft-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-page">
      <div class="callback-card">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Finalizando inicio de sesion con Microsoft...</p>
      </div>
    </div>
  `,
  styles: [`
    .callback-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      color: #1f2937;
      font-family: Arial, sans-serif;
    }

    .callback-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 24px;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
    }

    p {
      margin: 0;
      font-size: 14px;
    }
  `],
})
export class MicrosoftCallbackComponent implements OnInit {
  ngOnInit(): void {
    const payload = this.readResultPayload();

    if (payload) {
      const message = {
        ...payload,
        deliveredAt: Date.now(),
      };
      window.opener?.postMessage(message, window.location.origin);
      localStorage.setItem('microsoftLoginResult', JSON.stringify(message));
    }

    window.setTimeout(() => window.close(), 500);
  }

  private readResultPayload(): any | null {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const encodedResult = hash.get('result');

    if (!encodedResult) {
      return {
        source: 'microsoft-login',
        success: false,
        code: 'MICROSOFT_AUTH_FAILED',
        message: 'No se recibio respuesta de Microsoft',
      };
    }

    try {
      return JSON.parse(atob(encodedResult));
    } catch {
      return {
        source: 'microsoft-login',
        success: false,
        code: 'MICROSOFT_AUTH_FAILED',
        message: 'No se pudo leer la respuesta de Microsoft',
      };
    }
  }
}
