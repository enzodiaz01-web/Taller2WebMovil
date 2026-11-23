import { Injectable, inject } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CommentIn, CommentOut, Page } from '../models';
import { ApiConfigService } from './api-config.service';

@Injectable({
  providedIn: 'root',
})
export class CommentsService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);

  list(
    reviewIdFn: () => number | string | null | undefined,
    pageFn: () => number | null | undefined = () => 1,
    pageSizeFn: () => number | null | undefined = () => 20
  ) {
    return httpResource<Page<CommentOut>>(() => {
      const id = reviewIdFn();
      if (!id) return undefined;

      const page = pageFn() || 1;
      const pageSize = pageSizeFn() || 20;

      const searchParams = new URLSearchParams();
      searchParams.set('page', String(page));
      searchParams.set('page_size', String(pageSize));

      return `${this.apiConfig.apiUrl()}/reviews/${id}/comments?${searchParams.toString()}`;
    });
  }

  create(reviewId: number, body: CommentIn): Observable<CommentOut> {
    return this.http.post<CommentOut>(`${this.apiConfig.apiUrl()}/reviews/${reviewId}/comments`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiConfig.apiUrl()}/comments/${id}`);
  }
}
