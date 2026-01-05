import {ComponentFixture, TestBed} from '@angular/core/testing';
import {QualityControlForm} from './quality-control-form';
import {provideZonelessChangeDetection} from '@angular/core';
import {POLYMORPHEUS_CONTEXT} from '@taiga-ui/polymorpheus';

describe('QualityControlForm', () => {
  let component: QualityControlForm;
  let fixture: ComponentFixture<QualityControlForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QualityControlForm],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: {data: {quantity: 5}},
        },
      ],
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
