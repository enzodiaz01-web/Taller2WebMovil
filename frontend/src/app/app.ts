import { Component, HostListener, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { SITE_NAME } from './site.config';
import { AuthStore } from './services/auth.store';
import { AuthService } from './services/auth.service';
import { MobileService } from './services/mobile.service';
import { ServerConfigDialogComponent } from './components/server-config-dialog/server-config-dialog.component';
import { ShakePickDialogComponent } from './components/shake-pick-dialog/shake-pick-dialog.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatMenuModule,
    MatListModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  readonly siteName = SITE_NAME;
  readonly authStore = inject(AuthStore);
  readonly authService = inject(AuthService);
  readonly mobileService = inject(MobileService);
  readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly breakpointObserver = inject(BreakpointObserver);

  private isShakingModalOpen = false;

  ngOnInit(): void {
    void this.mobileService.startShakeDetection((magnitude) => {
      void this.onGlobalShake(magnitude);
    });
  }

  ngOnDestroy(): void {
    void this.mobileService.stopShakeDetection();
  }

  private async onGlobalShake(magnitude: number): Promise<void> {
    if (this.isShakingModalOpen) return;
    this.isShakingModalOpen = true;

    const res = await this.mobileService.pickGameByShake(magnitude, 'auto');
    if (!res.ok || !res.data) {
      this.isShakingModalOpen = false;
      return;
    }

    const ref = this.dialog.open(ShakePickDialogComponent, {
      data: res.data,
      width: '340px',
    });

    ref.afterClosed().subscribe((action) => {
      this.isShakingModalOpen = false;
      if (action === 'retry') {
        void this.onGlobalShake(magnitude);
      }
    });
  }

  readonly isMobile = toSignal(
    this.breakpointObserver
      .observe('(max-width: 767.98px)')
      .pipe(map((res) => res.matches)),
    { initialValue: false }
  );

  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects || e.url)
    ),
    { initialValue: '/' }
  );

  readonly scrollY = signal(0);
  readonly isScrolled = computed(() => this.scrollY() > 40);
  readonly isHome = computed(() => {
    const url = this.currentUrl();
    return url === '/' || url === '' || url.startsWith('/?');
  });
  readonly isTransparentToolbar = computed(
    () => this.isHome() && !this.isScrolled()
  );

  searchQuery = '';

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window !== 'undefined') {
      this.scrollY.set(window.scrollY || window.pageYOffset || 0);
    }
  }

  onSearch(query: string, drawer?: { close: () => void }): void {
    const trimmed = query.trim();
    if (trimmed) {
      this.router.navigate(['/games'], { queryParams: { q: trimmed } });
      this.searchQuery = '';
      if (drawer) {
        drawer.close();
      }
    }
  }

  async openQrScanner(drawer?: { close: () => void }): Promise<void> {
    if (drawer) {
      drawer.close();
    }
    const result = await this.mobileService.scanAndResolve();
    if (result.cancelled) {
      return;
    }
    if (!result.ok || !result.data) {
      this.snackBar.open(result.error || 'Error al escanear código', 'Cerrar', {
        duration: 4500,
      });
      return;
    }

    const scan = result.data;
    this.snackBar.open(scan.message, 'OK', { duration: 3500 });

    if (scan.kind === 'search' && scan.query) {
      this.router.navigate(['/games'], { queryParams: { q: scan.query } });
    } else if (scan.route) {
      this.router.navigateByUrl(scan.route);
    }
  }

  openServerConfig(drawer?: { close: () => void }): void {
    if (drawer) {
      drawer.close();
    }
    const ref = this.dialog.open(ServerConfigDialogComponent);
    ref.afterClosed().subscribe((saved) => {
      if (saved) {
        this.snackBar.open('URL del servidor actualizada', 'OK', { duration: 3000 });
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: () => {
        this.router.navigate(['/']);
      },
    });
  }
}
