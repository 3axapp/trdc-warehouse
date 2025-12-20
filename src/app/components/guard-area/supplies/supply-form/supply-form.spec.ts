import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupplyForm } from './supply-form';

describe('SupplyForm', () => {
  let component: SupplyForm;
  let fixture: ComponentFixture<SupplyForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplyForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SupplyForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
