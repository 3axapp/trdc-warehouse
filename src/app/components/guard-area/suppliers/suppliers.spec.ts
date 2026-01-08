import {ComponentFixture, TestBed} from '@angular/core/testing';

import {Suppliers} from './suppliers';
import {provideZonelessChangeDetection} from '@angular/core';
import {SuppliersCollection} from '../../../services/collections/suppliers.collection';

describe('Suppliers', () => {
  let component: Suppliers;
  let fixture: ComponentFixture<Suppliers>;
  let mockSuppliersService: jasmine.SpyObj<SuppliersCollection>;

  beforeEach(async () => {
    mockSuppliersService = jasmine.createSpyObj('SuppliersService', ['getList']);
    mockSuppliersService.getList.and.resolveTo([]);
    await TestBed.configureTestingModule({
      imports: [Suppliers],
      providers: [
        provideZonelessChangeDetection(),
        {provide: SuppliersCollection, useValue: mockSuppliersService},
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
