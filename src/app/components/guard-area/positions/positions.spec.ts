import {ComponentFixture, TestBed} from '@angular/core/testing';

import {Positions} from './positions';
import {provideZonelessChangeDetection} from '@angular/core';
import {Position, PositionsCollection} from '../../../services/collections/positions.collection';

describe('Positions', () => {
  let component: Positions;
  let fixture: ComponentFixture<Positions>;
  let mockPositionsService: jasmine.SpyObj<PositionsCollection>;

  beforeEach(async () => {
    mockPositionsService = jasmine.createSpyObj('PositionsService', ['getList']);
    mockPositionsService.getList.and.resolveTo([]);
    await TestBed.configureTestingModule({
      imports: [Positions],
      providers: [
        provideZonelessChangeDetection(),
        {provide: PositionsCollection, useValue: mockPositionsService},
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(Positions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
