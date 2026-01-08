import {ComponentFixture, TestBed} from '@angular/core/testing';

import {Executors} from './executors';
import {Injector, provideZonelessChangeDetection} from '@angular/core';
import {ExecutorsCollection} from '../../../services/collections/executors.collection';

describe('Executors', () => {
  let component: Executors;
  let fixture: ComponentFixture<Executors>;
  let mockExecutorsService: jasmine.SpyObj<ExecutorsCollection>;

  beforeEach(async () => {
    mockExecutorsService = jasmine.createSpyObj('ExecutorsService', ['archive', 'update', 'add', 'getList']);
    mockExecutorsService.getList.and.resolveTo([]);
    await TestBed.configureTestingModule({
      imports: [Executors],
      providers: [
        provideZonelessChangeDetection(),
        {provide: ExecutorsCollection, useValue: mockExecutorsService},
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
