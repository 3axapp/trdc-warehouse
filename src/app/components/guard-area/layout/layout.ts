import {Component, inject} from '@angular/core';
import {ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet} from "@angular/router";
import {TuiTabs} from '@taiga-ui/kit';
import {TuiHint} from '@taiga-ui/core';
import {AuthService} from '../../../services/auth.service';

@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    TuiTabs,
    RouterLink,
    TuiHint,
    RouterLinkActive,
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly activatedRoute = inject(ActivatedRoute);

  protected readonly urls = [
    {route: '', title: 'Склад'},
    {route: 'manufacturing', title: 'Производство'},
    {route: '', title: 'Упаковка'},
    {route: '', title: 'Отгрузка'},
    {route: '/positions', title: 'Позиции'},
    {route: '/suppliers', title: 'Поставщики'},
    {route: '/executors', title: 'Исполнители'},
  ];

  async logout() {
    await this.authService.logout();
    await this.router.navigate(['login']);
  }
}
