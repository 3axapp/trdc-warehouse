import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExecutorForm } from './executor-form';

describe('ExecutorForm', () => {
  let component: ExecutorForm;
  let fixture: ComponentFixture<ExecutorForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExecutorForm]
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
