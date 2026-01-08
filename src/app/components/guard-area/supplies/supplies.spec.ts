import {ComponentFixture, TestBed} from '@angular/core/testing';

import {Supplies} from './supplies';
import {provideZonelessChangeDetection} from '@angular/core';
import {SuppliesCollection} from '../../../services/collections/supplies.collection';
import {PositionsCollection} from '../../../services/collections/positions.collection';
import {SuppliersCollection} from '../../../services/collections/suppliers.collection';
import {CacheService} from '../../../services/cache.service';
import {AuthService} from '../../../services/auth.service';
import {Auth} from '@angular/fire/auth';

describe('Supplies', () => {
  let component: Supplies;
  let fixture: ComponentFixture<Supplies>;
  let mockSuppliesService: jasmine.SpyObj<SuppliesCollection>;
  let mockPositionsService: jasmine.SpyObj<PositionsCollection>;
  let mockSuppliersService: jasmine.SpyObj<SuppliersCollection>;
  let mockCacheService: jasmine.SpyObj<CacheService>;
  let mockAuth: jasmine.SpyObj<Auth>;

  beforeEach(async () => {
    mockSuppliesService = jasmine.createSpyObj('SuppliesService', ['getList']);
    mockPositionsService = jasmine.createSpyObj('PositionsService', ['getList']);
    mockSuppliersService = jasmine.createSpyObj('SuppliersService', ['getList']);
    mockCacheService = jasmine.createSpyObj('CacheService', ['get', 'add']);
    mockAuth = jasmine.createSpyObj('Auth', [], ['currentUser']);

    mockSuppliesService.getList.and.resolveTo([]);
    mockPositionsService.getList.and.resolveTo([]);
    mockSuppliersService.getList.and.resolveTo([]);

    await TestBed.configureTestingModule({
      imports: [Supplies],
      providers: [
        provideZonelessChangeDetection(),
        {provide: SuppliesCollection, useValue: mockSuppliesService},
        {provide: PositionsCollection, useValue: mockPositionsService},
        {provide: SuppliersCollection, useValue: mockSuppliersService},
        {provide: CacheService, useValue: mockCacheService},
        {provide: Auth, useValue: mockAuth},
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(Supplies);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
