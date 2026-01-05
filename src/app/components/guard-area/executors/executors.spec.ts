import {ComponentFixture, TestBed} from '@angular/core/testing';

import {Executors} from './executors';
import {Injector, provideZonelessChangeDetection} from '@angular/core';
import {ExecutorsService} from '../../../services/executors.service';

describe('Executors', () => {
  let component: Executors;
  let fixture: ComponentFixture<Executors>;
  let mockExecutorsService: jasmine.SpyObj<ExecutorsService>;

  beforeEach(async () => {
    mockExecutorsService = jasmine.createSpyObj('ExecutorsService', ['archive', 'update', 'add', 'getList']);
    mockExecutorsService.getList.and.resolveTo([]);
    await TestBed.configureTestingModule({
      imports: [Executors],
      providers: [
        provideZonelessChangeDetection(),
        {provide: ExecutorsService, useValue: mockExecutorsService},
      ],
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
