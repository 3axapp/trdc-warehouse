import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ExecutorForm} from './executor-form';
import {provideZonelessChangeDetection} from '@angular/core';
import {Supplier} from '../../../../services/suppliers.service';
import {POLYMORPHEUS_CONTEXT} from '@taiga-ui/polymorpheus';

describe('ExecutorForm', () => {
  let component: ExecutorForm;
  let fixture: ComponentFixture<ExecutorForm>;

  const mockDialogContext = {
    data: undefined as Supplier | undefined,
    completeWith: jasmine.createSpy('completeWith'),
    dismissWith: jasmine.createSpy('dismissWith'),
    readonly: false,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExecutorForm],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: mockDialogContext,
        },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(ExecutorForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
