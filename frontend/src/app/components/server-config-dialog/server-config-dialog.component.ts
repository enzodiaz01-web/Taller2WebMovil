import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiConfigService } from '../../services/api-config.service';

@Component({
  selector: 'app-server-config-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title class="cfg-title">
      <mat-icon>dns</mat-icon>
      <span>Servidor Backend (API)</span>
    </h2>

    <mat-dialog-content class="cfg-content">
      <p class="cfg-help">
        En un dispositivo Android real, apunta a la IP local de tu PC (por ejemplo
        <code>http://192.168.1.50:8000/api</code>) o a tu URL de túnel HTTPS.
      </p>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>URL de la API</mat-label>
        <input matInput [(ngModel)]="url" placeholder="http://192.168.1.50:8000/api" />
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="reset()">Restablecer</button>
      <button mat-button (click)="dialogRef.close()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="save()">Guardar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .cfg-title {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .cfg-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-width: 260px;
      }
      .cfg-help {
        font-size: 0.85rem;
        opacity: 0.8;
        margin: 0;
        line-height: 1.45;
      }
      .full-width {
        width: 100%;
      }
    `,
  ],
})
export class ServerConfigDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ServerConfigDialogComponent>);
  private readonly apiConfig = inject(ApiConfigService);

  url = this.apiConfig.apiUrl();

  save(): void {
    this.apiConfig.setApiUrl(this.url);
    this.dialogRef.close(true);
  }

  reset(): void {
    this.apiConfig.reset();
    this.url = this.apiConfig.apiUrl();
    this.dialogRef.close(true);
  }
}
