import { Injectable, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LibraryEntry, LibraryStatus, UserLibraryItem } from '../models';
import { ApiConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root',
})
export class LibraryService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);

  getPlaying(usernameFn: () => string | null | undefined) {
    return httpResource<UserLibraryItem[]>(() => {
      const u = usernameFn();
      if (!u) return undefined;
      return `${this.apiConfig.apiUrl()}/users/${encodeURIComponent(u)}/library?status=playing`;
    });
  }

  set(gameId: number, status: LibraryStatus): Observable<LibraryEntry> {
    return this.http.put<LibraryEntry>(`${this.apiConfig.apiUrl()}/library/${gameId}`, {
      status,
    });
  }

  remove(gameId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiConfig.apiUrl()}/library/${gameId}`);
  }
}
