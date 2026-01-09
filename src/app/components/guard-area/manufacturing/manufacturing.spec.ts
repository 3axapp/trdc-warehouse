import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Manufacturing} from './manufacturing';
import {provideZonelessChangeDetection} from '@angular/core';
import {provideFirebaseAppTest, provideFirestoreTest} from '../../../../tests/utils';
import {ActivatedRoute} from '@angular/router';
import {Position, PositionsCollection, PositionType} from '../../../services/collections/positions.collection';

describe('Manufacturing', () => {
  let component: Manufacturing;
  let fixture: ComponentFixture<Manufacturing>;
  let mockPositions: jasmine.SpyObj<PositionsCollection>;
  let mockPositionList: Position[] = [{id: '1', code: 'p1', name: 'name', type: PositionType.Produced}];

  beforeEach(async () => {
    mockPositions = jasmine.createSpyObj<PositionsCollection>('PositionsCollection', ['getList']);
    mockPositions.getList.and.resolveTo(mockPositionList);
    await TestBed.configureTestingModule({
      imports: [Manufacturing],
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideFirestoreTest(),
        {provide: ActivatedRoute, useValue: {snapshot:{data: {recipe: {code: 'p1'}}}}}
      ],
    })
      .compileComponents();


    fixture = TestBed.createComponent(Manufacturing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
