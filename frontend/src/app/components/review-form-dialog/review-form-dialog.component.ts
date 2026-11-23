import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { ReviewsService } from '../../services/reviews.service';
import { MobileService } from '../../services/mobile.service';
import { ReviewIn } from '../../models';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../confirm-dialog.component';

export interface ReviewFormDialogData {
  gameId: number;
  gameTitle: string;
  reviewId?: number | null;
}

export interface ReviewFormDialogResult {
  saved?: boolean;
  deleted?: boolean;
  conflict?: boolean;
}

@Component({
  selector: 'app-review-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="dialog-title">
        {{ isEditMode() ? 'Edit Review' : 'Write a Review' }}
        <span class="game-subtitle">{{ data.gameTitle }}</span>
      </h2>

      @if (loadingReview()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <span>Loading your review...</span>
        </div>
      } @else {
        <mat-dialog-content class="dialog-content">
          @if (serverError()) {
            <div class="server-error" role="alert">
              <mat-icon class="err-icon">error_outline</mat-icon>
              <span>{{ serverError() }}</span>
            </div>
          }

          <form [formGroup]="form" class="review-form">
            <!-- Score Selector (1-10) -->
            <div class="score-section">
              <label class="section-label">Score (1–10) *</label>
              <div class="score-buttons" role="group" aria-label="Select game score">
                @for (num of scoreOptions; track num) {
                  <button
                    type="button"
                    class="score-btn"
                    [class.selected]="form.controls.score.value === num"
                    [disabled]="saving()"
                    (click)="setScore(num)"
                  >
                    {{ num }}
                  </button>
                }
              </div>
              @if (form.controls.score.touched && form.controls.score.hasError('required')) {
                <div class="field-error">Score is required (1–10)</div>
              }
            </div>

            <!-- Review Body -->
            <mat-form-field appearance="outline" class="body-field">
              <mat-label>Your Review (optional)</mat-label>
              <textarea
                matInput
                [formControl]="form.controls.body"
                rows="6"
                placeholder="What did you think of the gameplay, story, visuals...?"
              ></textarea>
              <mat-hint align="end" [class.hint-overflow]="(form.controls.body.value || '').length > 5000">
                {{ (form.controls.body.value || '').length }} / 5000
              </mat-hint>
              @if (form.controls.body.hasError('maxlength')) {
                <mat-error>Review must not exceed 5000 characters</mat-error>
              }
            </mat-form-field>

            <!-- GPS Location Check-in -->
            <div class="location-section">
              <div class="location-header">
                <span class="section-label">Ubicación GPS (Check-in opcional)</span>
                @if (latitude() === null) {
                  <button
                    mat-stroked-button
                    type="button"
                    class="gps-btn"
                    [disabled]="saving() || locating()"
                    (click)="attachLocation()"
                  >
                    <mat-icon>{{ locating() ? 'gps_not_fixed' : 'my_location' }}</mat-icon>
                    <span>{{ locating() ? 'Obteniendo GPS...' : 'Adjuntar ubicación' }}</span>
                  </button>
                } @else {
                  <button
                    mat-button
                    type="button"
                    class="clear-gps-btn"
                    [disabled]="saving()"
                    (click)="clearLocation()"
                  >
                    <mat-icon>close</mat-icon>
                    <span>Quitar</span>
                  </button>
                }
              </div>

              @if (locationError()) {
                <div class="gps-error" role="alert">
                  <mat-icon>location_off</mat-icon>
                  <span>{{ locationError() }}</span>
                </div>
              }

              @if (latitude() !== null && longitude() !== null) {
                <div class="gps-attached">
                  <div class="gps-coords">
                    <mat-icon>location_on</mat-icon>
                    <span>{{ latitude() | number: '1.4-4' }}, {{ longitude() | number: '1.4-4' }}</span>
                  </div>
                  <mat-form-field appearance="outline" class="label-field">
                    <mat-label>Etiqueta del lugar (ej. Casa, UCN, Café)</mat-label>
                    <input matInput [formControl]="form.controls.locationLabel" maxlength="200" />
                  </mat-form-field>
                </div>
              }
            </div>
          </form>
        </mat-dialog-content>

        <mat-dialog-actions align="end" class="dialog-actions">
          @if (isEditMode()) {
            <button
              mat-button
              type="button"
              class="delete-btn"
              [disabled]="saving()"
              (click)="onDelete()"
            >
              Delete Review
            </button>
          }

          <div class="spacer"></div>

          <button
            mat-button
            type="button"
            [disabled]="saving()"
            (click)="onCancel()"
          >
            Cancel
          </button>

          <button
            mat-flat-button
            class="submit-btn"
            type="button"
            [disabled]="form.invalid || saving() || loadingReview()"
            (click)="onSubmit()"
          >
            @if (saving()) {
              <mat-spinner diameter="18" class="inline-spinner"></mat-spinner>
              <span>Saving...</span>
            } @else {
              <span>{{ isEditMode() ? 'Save Changes' : 'Submit Review' }}</span>
            }
          </button>
        </mat-dialog-actions>
      }
    </div>
  `,
  styles: [`
    .dialog-container {
      min-width: 320px;
      max-width: 580px;
      color: var(--text);
    }
    .dialog-title {
      margin: 0;
      padding: 24px 24px 12px;
      font-size: 20px;
      font-weight: 700;
      color: var(--text);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .game-subtitle {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
    }
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px 24px;
      color: var(--text-muted);
      font-size: 14px;
    }
    .dialog-content {
      padding: 12px 24px 16px !important;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .server-error {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(229, 72, 77, 0.12);
      border: 1px solid var(--danger);
      border-radius: var(--radius);
      padding: 10px 14px;
      color: var(--danger);
      font-size: 13px;
    }
    .err-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--danger);
    }
    .review-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .score-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .section-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }
    .score-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .score-btn {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      color: var(--text);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 150ms ease;

      &:hover:not(:disabled) {
        border-color: rgba(255, 255, 255, 0.25);
        background: rgba(255, 255, 255, 0.08);
      }

      &.selected {
        background: var(--accent);
        color: #111214;
        border-color: var(--accent);
        font-weight: 800;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
    }
    .field-error {
      color: var(--danger);
      font-size: 12px;
      margin-top: 4px;
    }
    .body-field,
    .label-field {
      width: 100%;
    }
    .hint-overflow {
      color: var(--danger) !important;
    }
    .location-section {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px;
      border-radius: var(--radius);
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
    }
    .location-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .gps-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .clear-gps-btn {
      color: var(--text-muted) !important;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .gps-attached {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .gps-coords {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--accent);
      font-weight: 500;
    }
    .gps-coords mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    .gps-error {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--danger);
    }
    .gps-error mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .dialog-actions {
      padding: 16px 24px 20px !important;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .spacer {
      flex: 1;
    }
    .delete-btn {
      color: var(--danger) !important;
    }
    .submit-btn {
      background-color: var(--text) !important;
      color: var(--bg) !important;
      font-weight: 600 !important;
      border-radius: var(--radius-pill) !important;
      padding: 0 20px !important;
      display: inline-flex;
      align-items: center;
      gap: 8px;

      &:disabled {
        opacity: 0.5 !important;
      }
    }
    .inline-spinner {
      display: inline-block;
    }
  `],
})
export class ReviewFormDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ReviewFormDialogComponent>);
  readonly data = inject<ReviewFormDialogData>(MAT_DIALOG_DATA);
  private readonly reviewsService = inject(ReviewsService);
  private readonly mobileService = inject(MobileService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly scoreOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  readonly saving = signal(false);
  readonly loadingReview = signal(false);
  readonly locating = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly locationError = signal<string | null>(null);
  readonly latitude = signal<number | null>(null);
  readonly longitude = signal<number | null>(null);

  readonly isEditMode = computed(() => Boolean(this.data.reviewId));

  readonly form = new FormGroup({
    score: new FormControl<number | null>(null, {
      nonNullable: false,
      validators: [Validators.required, Validators.min(1), Validators.max(10)],
    }),
    body: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(5000)],
    }),
    locationLabel: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.maxLength(200)],
    }),
  });

  ngOnInit(): void {
    if (this.data.reviewId) {
      this.loadingReview.set(true);
      this.reviewsService.getOne(this.data.reviewId).subscribe({
        next: (review) => {
          this.form.patchValue({
            score: review.score,
            body: review.body || '',
            locationLabel: review.location_label || '',
          });
          this.latitude.set(review.latitude ?? null);
          this.longitude.set(review.longitude ?? null);
          this.loadingReview.set(false);
        },
        error: (err) => {
          this.serverError.set(err.error?.detail || 'Failed to load review details');
          this.loadingReview.set(false);
        },
      });
    }
  }

  setScore(num: number): void {
    this.form.controls.score.setValue(num);
    this.form.controls.score.markAsDirty();
    this.form.controls.score.markAsTouched();
  }

  async attachLocation(): Promise<void> {
    this.locating.set(true);
    this.locationError.set(null);

    const res = await this.mobileService.getCurrentLocation();
    this.locating.set(false);

    if (!res.ok || !res.data) {
      this.locationError.set(res.error || 'No se pudo obtener la ubicación GPS.');
      return;
    }

    this.latitude.set(res.data.latitude);
    this.longitude.set(res.data.longitude);
    if (!this.form.controls.locationLabel.value.trim()) {
      this.form.controls.locationLabel.setValue(res.data.label);
    }
  }

  clearLocation(): void {
    this.latitude.set(null);
    this.longitude.set(null);
    this.form.controls.locationLabel.setValue('');
    this.locationError.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving() || this.loadingReview()) {
      return;
    }

    this.saving.set(true);
    this.serverError.set(null);

    const payload: ReviewIn = {
      score: this.form.controls.score.value!,
      body: this.form.controls.body.value?.trim() || null,
    };

    if (this.latitude() !== null && this.longitude() !== null) {
      payload.latitude = this.latitude();
      payload.longitude = this.longitude();
      payload.location_label = this.form.controls.locationLabel.value?.trim() || null;
    }

    if (this.data.reviewId) {
      this.reviewsService.update(this.data.reviewId, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.snackBar.open('Review saved', 'Close', { duration: 3000 });
          this.dialogRef.close({ saved: true });
        },
        error: (err) => {
          this.saving.set(false);
          if (err.status === 409) {
            this.serverError.set('You already reviewed this game');
          } else {
            this.serverError.set(err.error?.detail || 'Failed to save review');
          }
        },
      });
    } else {
      this.reviewsService.create(this.data.gameId, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.snackBar.open('Review saved', 'Close', { duration: 3000 });
          this.dialogRef.close({ saved: true });
        },
        error: (err) => {
          this.saving.set(false);
          if (err.status === 409) {
            this.serverError.set('You already reviewed this game');
          } else {
            this.serverError.set(err.error?.detail || 'Failed to save review');
          }
        },
      });
    }
  }

  onDelete(): void {
    if (!this.data.reviewId || this.saving()) return;

    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete review?',
        message: 'Are you sure you want to delete your review? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        destructive: true,
      } as ConfirmDialogData,
    });

    confirmRef.afterClosed().subscribe((confirmed) => {
      if (confirmed && this.data.reviewId) {
        this.saving.set(true);
        this.reviewsService.delete(this.data.reviewId).subscribe({
          next: () => {
            this.saving.set(false);
            this.snackBar.open('Review deleted', 'Close', { duration: 3000 });
            this.dialogRef.close({ deleted: true });
          },
          error: (err) => {
            this.saving.set(false);
            this.serverError.set(err.error?.detail || 'Failed to delete review');
          },
        });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
