import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManufacturingSuccess } from './manufacturing-success';
import {provideZonelessChangeDetection} from '@angular/core';
import {POLYMORPHEUS_CONTEXT} from '@taiga-ui/polymorpheus';

describe('ManufacturingSuccess', () => {
  let component: ManufacturingSuccess;
  let fixture: ComponentFixture<ManufacturingSuccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: {data: []},
        },
      ],
      imports: [ManufacturingSuccess]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManufacturingSuccess);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
