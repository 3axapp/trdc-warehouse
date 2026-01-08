import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PositionForm } from './position-form';
import {provideZonelessChangeDetection} from '@angular/core';
import {PositionsCollection} from '../../../../services/collections/positions.collection';
import {POLYMORPHEUS_CONTEXT} from '@taiga-ui/polymorpheus';

describe('PositionForm', () => {
  let component: PositionForm;
  let fixture: ComponentFixture<PositionForm>;
  let mockPositionsService: jasmine.SpyObj<PositionsCollection>;

  beforeEach(async () => {
    mockPositionsService = jasmine.createSpyObj('PositionsService', ['getList']);
    mockPositionsService.getList.and.resolveTo([]);
    await TestBed.configureTestingModule({
      imports: [PositionForm],
      providers: [
        provideZonelessChangeDetection(),
        {provide: PositionsCollection, useValue: mockPositionsService},
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: {},
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PositionForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
