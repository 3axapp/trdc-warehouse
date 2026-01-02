import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManufacturingForm } from './manufacturing-form';

describe('ManufacturingForm', () => {
  let component: ManufacturingForm;
  let fixture: ComponentFixture<ManufacturingForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManufacturingForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManufacturingForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
