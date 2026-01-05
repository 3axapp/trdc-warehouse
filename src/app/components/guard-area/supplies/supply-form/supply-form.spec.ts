import {ComponentFixture, TestBed} from '@angular/core/testing';
import {SupplyForm} from './supply-form';
import {provideZonelessChangeDetection} from '@angular/core';
import {POLYMORPHEUS_CONTEXT} from '@taiga-ui/polymorpheus';
import {PositionsService} from '../../../../services/positions.service';
import {SuppliersService} from '../../../../services/suppliers.service';

describe('SupplyForm', () => {
  let component: SupplyForm;
  let fixture: ComponentFixture<SupplyForm>;
  let mockPositionsService: jasmine.SpyObj<PositionsService>;
  let mockSuppliersService: jasmine.SpyObj<SuppliersService>;

  beforeEach(async () => {
    mockPositionsService = jasmine.createSpyObj('PositionsService', ['getList']);
    mockSuppliersService = jasmine.createSpyObj('SuppliersService', ['getList']);
    mockPositionsService.getList.and.resolveTo([]);
    mockSuppliersService.getList.and.resolveTo([]);
    await TestBed.configureTestingModule({
      imports: [SupplyForm],
      providers: [
        provideZonelessChangeDetection(),
        {provide: PositionsService, useValue: mockPositionsService},
        {provide: SuppliersService, useValue: mockSuppliersService},
        {
          provide: POLYMORPHEUS_CONTEXT,
          useValue: {},
        },
      ],
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
