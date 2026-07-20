import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TuiTabs } from '@taiga-ui/kit';
import { TuiHint } from '@taiga-ui/core';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, TuiTabs, RouterLink, TuiHint, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly allUrls = [
    { route: 'quarantine', title: 'Карантин' },
    { route: '', title: 'Склад' },
    { route: 'reserve', title: 'Резерв' },
    { route: 'manufacturing', title: 'Производство' },
    { route: 'packing', title: 'Упаковка' },
    { route: 'shipments', title: 'Отгрузка' },
    { route: 'positions', title: 'Позиции' },
    { route: 'suppliers', title: 'Поставщики' },
    { route: 'executors', title: 'Исполнители' },
    { route: 'backup', title: 'Бэкап', adminOnly: true },
  ];

  /** Вкладки, доступные текущему пользователю. Доступ к маршруту всё равно проверяет adminGuard. */
  protected readonly urls = this.allUrls.filter(
    (url) => !url.adminOnly || this.authService.isAdmin(),
  );

  protected async logout() {
    await this.authService.logout();
    await this.router.navigate(['login']);
  }
}
