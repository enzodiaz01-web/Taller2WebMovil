import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../environments/environment';

const API_URL_KEY = 'gamelock_api_url';

function getInitialApiUrl(): string {
  try {
    const saved = localStorage.getItem(API_URL_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {
    // localStorage unavailable
  }
  // En emulador Android o nativo, localhost es el propio teléfono; 10.0.2.2 apunta a la PC host
  if (Capacitor.isNativePlatform()) {
    return 'http://10.0.2.2:8000/api';
  }
  return environment.apiUrl;
}

@Injectable({
  providedIn: 'root',
})
export class ApiConfigService {
  readonly apiUrl = signal<string>(getInitialApiUrl());

  setApiUrl(url: string): void {
    const cleaned = url.trim().replace(/\/+$/, '');
    if (!cleaned) {
      this.reset();
      return;
    }
    this.apiUrl.set(cleaned);
    try {
      localStorage.setItem(API_URL_KEY, cleaned);
    } catch {
      // Storage unavailable
    }
  }

  reset(): void {
    this.apiUrl.set(environment.apiUrl);
    try {
      localStorage.removeItem(API_URL_KEY);
    } catch {
      // Storage unavailable
    }
  }
}
