import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerScanOrientation,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Motion } from '@capacitor/motion';
import { firstValueFrom } from 'rxjs';
import { MobileEventOut, ScanOut, ShakePickOut } from '../models';
import { ApiConfigService } from './api-config.service';

export interface GeoCoords {
  latitude: number;
  longitude: number;
  label: string;
}

export interface MobileActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  cancelled?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MobileService {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);

  readonly isNative = Capacitor.isNativePlatform();
  readonly shakeActive = signal(false);
  readonly sensorError = signal<string | null>(null);
  readonly lastCoords = signal<GeoCoords | null>(null);

  private accelHandle: PluginListenerHandle | null = null;
  private lastShakeTs = 0;

  async getCurrentLocation(): Promise<MobileActionResult<GeoCoords>> {
    try {
      if (this.isNative) {
        const permStatus = await Geolocation.checkPermissions();
        if (permStatus.location !== 'granted' && permStatus.coarseLocation !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted' && req.coarseLocation !== 'granted') {
            return {
              ok: false,
              error:
                'Permiso de ubicación denegado. Actívalo en los ajustes de Android para adjuntar tu ubicación.',
            };
          }
        }
      } else if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        return {
          ok: false,
          error: 'Tu dispositivo o navegador no soporta servicios de geolocalización.',
        };
      }

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      });

      const lat = Number(pos.coords.latitude.toFixed(5));
      const lng = Number(pos.coords.longitude.toFixed(5));
      const coords: GeoCoords = {
        latitude: lat,
        longitude: lng,
        label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      };
      this.lastCoords.set(coords);
      return { ok: true, data: coords };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err ?? '');
      const lower = msg.toLowerCase();
      if (lower.includes('denied') || lower.includes('permission')) {
        return {
          ok: false,
          error: 'Permiso de ubicación rechazado. Habilítalo para usar GPS.',
        };
      }
      if (lower.includes('timeout')) {
        return {
          ok: false,
          error: 'Tiempo de espera agotado al obtener señal GPS. Verifica que la ubicación esté encendida.',
        };
      }
      return {
        ok: false,
        error: 'No se pudo obtener tu ubicación actual. Verifica que el GPS esté activado.',
      };
    }
  }

  async scanAndResolve(): Promise<MobileActionResult<ScanOut>> {
    try {
      const scanRes = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.ALL,
        scanInstructions: 'Apunta a un código QR de Gamelock o código de barras de un videojuego',
        scanButton: false,
        cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
        scanOrientation: CapacitorBarcodeScannerScanOrientation.PORTRAIT,
      });

      const code = scanRes?.ScanResult?.trim();
      if (!code) {
        return { ok: false, cancelled: true };
      }

      await this.vibrateLight();
      const coords = this.lastCoords();
      const formatName =
        typeof scanRes.format === 'number'
          ? CapacitorBarcodeScannerTypeHint[scanRes.format] || String(scanRes.format)
          : String(scanRes.format || 'QR_CODE');

      const resolved = await firstValueFrom(
        this.http.post<ScanOut>(`${this.apiConfig.apiUrl()}/mobile/scans`, {
          code,
          format: formatName,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        })
      );

      return { ok: true, data: resolved };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err ?? '');
      const lower = msg.toLowerCase();
      if (lower.includes('cancel') || lower.includes('abort')) {
        return { ok: false, cancelled: true };
      }
      if (lower.includes('permission') || lower.includes('denied')) {
        return {
          ok: false,
          error:
            'Permiso de cámara denegado. Concédelo en la configuración de Android para escanear códigos.',
        };
      }
      if (lower.includes('not available') || lower.includes('camera') || lower.includes('device')) {
        return {
          ok: false,
          error: 'La cámara no está disponible en este dispositivo.',
        };
      }
      return {
        ok: false,
        error: 'No se pudo completar el escaneo. Intenta nuevamente.',
      };
    }
  }

  async resolveManualCode(code: string): Promise<MobileActionResult<ScanOut>> {
    try {
      const coords = this.lastCoords();
      const resolved = await firstValueFrom(
        this.http.post<ScanOut>(`${this.apiConfig.apiUrl()}/mobile/scans`, {
          code: code.trim(),
          format: 'MANUAL',
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        })
      );
      return { ok: true, data: resolved };
    } catch {
      return {
        ok: false,
        error: 'No se pudo consultar el código con el servidor.',
      };
    }
  }

  async pickGameByShake(
    magnitude: number,
    source: 'wishlist' | 'catalog' | 'auto' = 'auto'
  ): Promise<MobileActionResult<ShakePickOut>> {
    try {
      await this.vibrateMedium();
      const coords = this.lastCoords();
      const picked = await firstValueFrom(
        this.http.post<ShakePickOut>(`${this.apiConfig.apiUrl()}/mobile/shake-pick`, {
          magnitude,
          source,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
        })
      );
      return { ok: true, data: picked };
    } catch (err: unknown) {
      const msg =
        (err as { error?: { detail?: string } })?.error?.detail ||
        'No se pudo obtener una recomendación del servidor.';
      return { ok: false, error: msg };
    }
  }

  async startShakeDetection(onShake: (magnitude: number) => void): Promise<boolean> {
    await this.stopShakeDetection();
    this.sensorError.set(null);

    try {
      if (!this.isNative && typeof window !== 'undefined' && !('DeviceMotionEvent' in window)) {
        this.sensorError.set(
          'Acelerómetro no disponible en este navegador. Usa el botón "Elegir al azar".'
        );
        return false;
      }

      // iOS / Safari permission API if present
      const motionEventCtor = (
        window as unknown as {
          DeviceMotionEvent?: { requestPermission?: () => Promise<string> };
        }
      ).DeviceMotionEvent;
      if (!this.isNative && typeof motionEventCtor?.requestPermission === 'function') {
        const perm = await motionEventCtor.requestPermission();
        if (perm !== 'granted') {
          this.sensorError.set('Permiso de sensor de movimiento denegado.');
          return false;
        }
      }

      let lastX = 0;
      let lastY = 0;
      let lastZ = 0;
      let hasLast = false;
      const SHAKE_THRESHOLD = 9.0; // Umbral calibrado y sensible para sacudida natural de mano (m/s^2)
      const DELTA_THRESHOLD = 10.5; // Cambio brusco de dirección al agitar adelante y atrás
      const COOLDOWN_MS = 1500; // 1.5s entre recomendaciones para evitar doble activación

      this.accelHandle = await Motion.addListener('accel', (event) => {
        const a = event.acceleration ?? event.accelerationIncludingGravity;
        if (!a) return;

        const x = a.x ?? 0;
        const y = a.y ?? 0;
        const z = a.z ?? 0;

        const mag = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
        // Si no viene aceleración lineal neta, restamos la componente estática de gravedad
        const effectiveMag = event.acceleration ? mag : Math.abs(mag - 9.81);

        // Diferencia vectorial entre muestras consecutivas (vaivén típico de sacudir)
        let delta = 0;
        if (hasLast) {
          delta = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2 + (z - lastZ) ** 2);
        }
        lastX = x;
        lastY = y;
        lastZ = z;
        hasLast = true;

        const now = Date.now();
        if ((effectiveMag >= SHAKE_THRESHOLD || delta >= DELTA_THRESHOLD) && now - this.lastShakeTs > COOLDOWN_MS) {
          this.lastShakeTs = now;
          const reportMag = Math.max(effectiveMag, delta);
          onShake(Number(reportMag.toFixed(2)));
        }
      });

      this.shakeActive.set(true);
      return true;
    } catch {
      this.sensorError.set(
        'No se pudo inicializar el acelerómetro en este dispositivo. Usa el botón manual.'
      );
      this.shakeActive.set(false);
      return false;
    }
  }

  async stopShakeDetection(): Promise<void> {
    if (this.accelHandle) {
      try {
        await this.accelHandle.remove();
      } catch {
        // ignore cleanup errors
      }
      this.accelHandle = null;
    }
    this.shakeActive.set(false);
  }

  async getActivity(): Promise<MobileEventOut[]> {
    return firstValueFrom(
      this.http.get<MobileEventOut[]>(`${this.apiConfig.apiUrl()}/mobile/activity`)
    );
  }

  private async vibrateLight(): Promise<void> {
    if (!this.isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // ignore if haptics unsupported
    }
  }

  private async vibrateMedium(): Promise<void> {
    if (!this.isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // ignore if haptics unsupported
    }
  }
}
