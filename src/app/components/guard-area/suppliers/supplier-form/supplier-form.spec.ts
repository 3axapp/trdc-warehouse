import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SupplierForm} from './supplier-form';
import {provideZonelessChangeDetection} from '@angular/core';
import {POLYMORPHEUS_CONTEXT} from '@taiga-ui/polymorpheus';

describe('SupplierForm', () => {
  let component: SupplierForm;
  let fixture: ComponentFixture<SupplierForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplierForm],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: {},
        },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(SupplierForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
