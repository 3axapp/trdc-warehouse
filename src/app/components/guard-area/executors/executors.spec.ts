import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Executors } from './executors';
import { provideZonelessChangeDetection } from '@angular/core';
import { UsersCollection } from '../../../services/collections/users.collection';

describe('Executors', () => {
  let component: Executors;
  let fixture: ComponentFixture<Executors>;
  let mockExecutorsService: jasmine.SpyObj<UsersCollection>;

  beforeEach(async () => {
    mockExecutorsService = jasmine.createSpyObj('ExecutorsService', [
      'archive',
      'update',
      'add',
      'getList',
    ]);
    mockExecutorsService.getList.and.resolveTo([]);
    await TestBed.configureTestingModule({
      imports: [Executors],
      providers: [
        provideZonelessChangeDetection(),
        { provide: UsersCollection, useValue: mockExecutorsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Executors);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
