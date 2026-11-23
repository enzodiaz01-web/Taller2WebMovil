import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ShakePickOut } from '../../models';

@Component({
  selector: 'app-shake-pick-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="pick-title">
      <mat-icon>vibration</mat-icon>
      <span>¡Tu próximo juego!</span>
    </h2>

    <mat-dialog-content class="pick-content">
      <span class="source-pill" [class.wishlist]="data.from_wishlist">
        <mat-icon>{{ data.from_wishlist ? 'favorite' : 'explore' }}</mat-icon>
        {{ data.from_wishlist ? 'Elegido de tu Wishlist' : 'Sugerencia del Catálogo' }}
      </span>

      @if (data.game.cover_url) {
        <img [src]="data.game.cover_url" [alt]="data.game.title" class="pick-cover" />
      }

      <h3 class="game-title">{{ data.game.title }}</h3>

      @if (data.game.genres.length > 0) {
        <p class="game-genres">
          {{ genreNames }}
        </p>
      }

      @if (data.game.avg_score !== null) {
        <div class="game-score">
          <mat-icon>star</mat-icon>
          <span>{{ data.game.avg_score | number: '1.1-1' }} / 10</span>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close('retry')">Otro</button>
      <button mat-flat-button color="primary" (click)="openGame()">Ver juego</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .pick-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pick-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 10px;
      }
      .source-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.78rem;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 999px;
        background: rgba(124, 92, 255, 0.16);
        color: #b7a4ff;
      }
      .source-pill.wishlist {
        background: rgba(233, 30, 99, 0.16);
        color: #ff80ab;
      }
      .source-pill mat-icon {
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
      .pick-cover {
        width: 150px;
        height: 200px;
        object-fit: cover;
        border-radius: 10px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
      }
      .game-title {
        margin: 4px 0 0;
        font-size: 1.15rem;
        font-weight: 700;
      }
      .game-genres {
        margin: 0;
        font-size: 0.85rem;
        opacity: 0.75;
      }
      .game-score {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-weight: 600;
        color: #ffd54f;
      }
      .game-score mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    `,
  ],
})
export class ShakePickDialogComponent {
  readonly data = inject<ShakePickOut>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ShakePickDialogComponent>);
  private readonly router = inject(Router);

  get genreNames(): string {
    return this.data.game.genres.map((g) => g.name).join(' · ');
  }

  openGame(): void {
    this.dialogRef.close('open');
    this.router.navigate(['/games', this.data.game.id]);
  }
}
