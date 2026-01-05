import {ComponentFixture, TestBed} from '@angular/core/testing';

import {Layout} from './layout';
import {AuthService} from '../../../services/auth.service';
import {provideRouter} from '@angular/router';
import {provideZonelessChangeDetection} from '@angular/core';

describe('Layout', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;

  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        provideZonelessChangeDetection(),
        {provide: AuthService, useValue: mockAuthService},
        provideRouter([]),
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
