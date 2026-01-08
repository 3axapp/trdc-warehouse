import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Manufacturing} from './manufacturing';
import {provideZonelessChangeDetection} from '@angular/core';
import {ManufacturingService} from '../../../services/manufacturing.service';
import {ExecutorsCollection} from '../../../services/collections/executors.collection';
import {provideFirebaseAppTest, provideFirestoreTest} from '../../../../tests/utils';

describe('Manufacturing', () => {
  let component: Manufacturing;
  let fixture: ComponentFixture<Manufacturing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Manufacturing],
      providers: [
        provideZonelessChangeDetection(),
        provideFirebaseAppTest(),
        provideFirestoreTest(),
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
