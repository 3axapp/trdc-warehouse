import {ComponentFixture, TestBed} from '@angular/core/testing';

import {Positions} from './positions';
import {provideZonelessChangeDetection} from '@angular/core';

describe('Positions', () => {
  let component: Positions;
  let fixture: ComponentFixture<Positions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Positions],
      providers: [
        provideZonelessChangeDetection(),
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
