import {ComponentFixture, TestBed} from '@angular/core/testing';

import {ManufacturingForm} from './manufacturing-form';
import {provideZonelessChangeDetection} from '@angular/core';
import {POLYMORPHEUS_CONTEXT} from '@taiga-ui/polymorpheus';

describe('ManufacturingForm', () => {
  let component: ManufacturingForm;
  let fixture: ComponentFixture<ManufacturingForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManufacturingForm],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: {data: {availability: {available: 5}}},
        },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(ManufacturingForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
