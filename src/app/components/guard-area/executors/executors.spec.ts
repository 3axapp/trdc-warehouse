import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Executors } from './executors';

describe('Executors', () => {
  let component: Executors;
  let fixture: ComponentFixture<Executors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Executors]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Executors);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
