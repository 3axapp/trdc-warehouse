import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Layout } from './layout';
import { AuthService } from '../../../services/auth.service';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';

describe('Layout', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;

  let mockAuthService: jasmine.SpyObj<AuthService>;

  /** Пересобирает компонент: вкладки считаются один раз при создании. */
  const createComponent = async (isAdmin: boolean): Promise<void> => {
    TestBed.resetTestingModule();
    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', ['logout', 'isAdmin']);
    mockAuthService.isAdmin.and.returnValue(isAdmin);

    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  /** Маршруты вкладок, видимых пользователю. */
  const visibleRoutes = (): string[] =>
    (component as unknown as { urls: { route: string }[] }).urls.map((url) => url.route);

  beforeEach(async () => {
    await createComponent(false);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('скрывает вкладку бэкапа от обычного пользователя', async () => {
    await createComponent(false);

    expect(visibleRoutes()).not.toContain('backup');
    expect(visibleRoutes()).toContain('positions');
  });

  it('показывает вкладку бэкапа админу', async () => {
    await createComponent(true);

    expect(visibleRoutes()).toContain('backup');
  });
});
