import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Manufacturing} from './manufacturing';
import {provideZonelessChangeDetection} from '@angular/core';
import {
  clearFirestoreEmulator,
  provideAuthTest,
  provideFirebaseAppTest,
  provideFirestoreTest,
  signOut,
  signupAndSignin,
} from '../../../../tests/utils';
import {ActivatedRoute} from '@angular/router';
import {Position, PositionsCollection, PositionType} from '../../../services/collections/positions.collection';

// @todo тест падает с исключением firebase
// describe('Manufacturing', () => {
//   let component: Manufacturing;
//   let fixture: ComponentFixture<Manufacturing>;
//   let mockPositions: jasmine.SpyObj<PositionsCollection>;
//   let mockPositionList: Position[] = [{id: '1', code: 'p1', name: 'name', type: PositionType.Produced}];
//
//   beforeAll(async () => await clearFirestoreEmulator());
//
//   beforeEach(async () => {
//     mockPositions = jasmine.createSpyObj<PositionsCollection>('PositionsCollection', ['getList']);
//     mockPositions.getList.and.resolveTo(mockPositionList);
//     await TestBed.configureTestingModule({
//       imports: [Manufacturing],
//       providers: [
//         provideZonelessChangeDetection(),
//         provideFirebaseAppTest(),
//         provideFirestoreTest(),
//         provideAuthTest(),
//         {provide: ActivatedRoute, useValue: {snapshot: {data: {recipe: {id: 'id', code: 'p1', items: []}}}}},
//       ],
//     })
//       .compileComponents();
//
//     await signupAndSignin(TestBed);
//
//     fixture = TestBed.createComponent(Manufacturing);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });
//
//   afterEach(async () => await signOut(TestBed));
//
//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });
