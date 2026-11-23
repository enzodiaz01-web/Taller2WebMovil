import { Injectable, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { GameCard, GameDetail, Genre, Page } from '../models';
import { ApiConfigService } from './api-config.service';

export interface GameListParams {
  q?: string | null;
  genre?: string | null;
  sort?: string | null;
  page?: number | null;
  page_size?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class GamesService {
  private readonly apiConfig = inject(ApiConfigService);

  genres() {
    return httpResource<Genre[]>(() => `${this.apiConfig.apiUrl()}/genres`);
  }

  detail(idFn: () => number | string | null | undefined) {
    return httpResource<GameDetail>(() => {
      const id = idFn();
      if (!id) return undefined;
      return `${this.apiConfig.apiUrl()}/games/${id}`;
    });
  }

  list(paramsFn: () => GameListParams) {
    return httpResource<Page<GameCard>>(() => {
      const p = paramsFn();
      const searchParams = new URLSearchParams();

      if (p.q && p.q.trim()) {
        searchParams.set('q', p.q.trim());
      }
      if (p.genre && p.genre.trim()) {
        searchParams.set('genre', p.genre.trim());
      }
      if (p.sort && p.sort.trim()) {
        searchParams.set('sort', p.sort.trim());
      }
      if (p.page != null && p.page > 0) {
        searchParams.set('page', String(p.page));
      }
      if (p.page_size != null && p.page_size > 0) {
        searchParams.set('page_size', String(p.page_size));
      }

      const qs = searchParams.toString();
      return `${this.apiConfig.apiUrl()}/games${qs ? '?' + qs : ''}`;
    });
  }
}
