import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PositionForm } from './position-form';

describe('PositionForm', () => {
  let component: PositionForm;
  let fixture: ComponentFixture<PositionForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PositionForm]
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
