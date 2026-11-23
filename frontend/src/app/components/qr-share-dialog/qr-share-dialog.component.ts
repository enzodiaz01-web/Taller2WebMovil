import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import * as QRCode from 'qrcode';

export interface QrShareDialogData {
  title: string;
  subtitle: string;
  payload: string;
}

@Component({
  selector: 'app-qr-share-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="qr-title">
      <mat-icon>qr_code_2</mat-icon>
      <span>Compartir por QR</span>
    </h2>

    <mat-dialog-content class="qr-content">
      <p class="entity-title">{{ data.title }}</p>
      <p class="entity-subtitle">{{ data.subtitle }}</p>

      @if (qrDataUrl()) {
        <div class="qr-frame">
          <img [src]="qrDataUrl()" [alt]="'QR de ' + data.title" class="qr-image" />
        </div>
      } @else if (error()) {
        <p class="qr-error">{{ error() }}</p>
      }

      <code class="qr-payload">{{ data.payload }}</code>
      <p class="qr-hint">Escanea este código con el lector QR de Gamelock en otro dispositivo.</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" (click)="dialogRef.close()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .qr-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .qr-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 8px;
        padding-top: 4px;
      }
      .entity-title {
        font-size: 1.05rem;
        font-weight: 600;
        margin: 0;
      }
      .entity-subtitle {
        font-size: 0.85rem;
        opacity: 0.75;
        margin: 0 0 8px;
      }
      .qr-frame {
        background: #ffffff;
        padding: 12px;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      }
      .qr-image {
        display: block;
        width: 220px;
        height: 220px;
      }
      .qr-payload {
        font-size: 0.8rem;
        opacity: 0.8;
        padding: 4px 8px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.08);
      }
      .qr-hint {
        font-size: 0.8rem;
        opacity: 0.7;
        margin: 4px 0 0;
        max-width: 260px;
      }
      .qr-error {
        color: #ff6b6b;
      }
    `,
  ],
})
export class QrShareDialogComponent implements OnInit {
  readonly data = inject<QrShareDialogData>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<QrShareDialogComponent>);

  readonly qrDataUrl = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const url = await QRCode.toDataURL(this.data.payload, {
        width: 240,
        margin: 1,
        color: {
          dark: '#121218',
          light: '#ffffff',
        },
      });
      this.qrDataUrl.set(url);
    } catch {
      this.error.set('No se pudo generar el código QR.');
    }
  }
}
