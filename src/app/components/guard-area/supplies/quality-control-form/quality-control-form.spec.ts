import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QualityControlForm } from './quality-control-form';

describe('QualityControlForm', () => {
  let component: QualityControlForm;
  let fixture: ComponentFixture<QualityControlForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QualityControlForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QualityControlForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
