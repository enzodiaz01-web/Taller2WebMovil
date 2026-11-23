import { Injectable, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Genre, Home } from '../models';
import { ApiConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  private readonly apiConfig = inject(ApiConfigService);

  home() {
    return httpResource<Home>(() => `${this.apiConfig.apiUrl()}/home`);
  }

  genres() {
    return httpResource<Genre[]>(() => `${this.apiConfig.apiUrl()}/genres`);
  }
}
