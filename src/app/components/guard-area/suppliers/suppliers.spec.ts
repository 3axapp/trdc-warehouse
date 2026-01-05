import {ComponentFixture, TestBed} from '@angular/core/testing';

import {Suppliers} from './suppliers';
import {provideZonelessChangeDetection} from '@angular/core';
import {SuppliersService} from '../../../services/suppliers.service';

describe('Suppliers', () => {
  let component: Suppliers;
  let fixture: ComponentFixture<Suppliers>;
  let mockSuppliersService: jasmine.SpyObj<SuppliersService>;

  beforeEach(async () => {
    mockSuppliersService = jasmine.createSpyObj('SuppliersService', ['getList']);
    mockSuppliersService.getList.and.resolveTo([]);
    await TestBed.configureTestingModule({
      imports: [Suppliers],
      providers: [
        provideZonelessChangeDetection(),
        {provide: SuppliersService, useValue: mockSuppliersService},
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(Suppliers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
