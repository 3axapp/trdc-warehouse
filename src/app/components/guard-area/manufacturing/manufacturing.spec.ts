import {ComponentFixture, TestBed} from '@angular/core/testing';
import {Manufacturing} from './manufacturing';
import {provideZonelessChangeDetection} from '@angular/core';
import {ManufacturingService} from '../../../services/manufacturing.service';
import {ExecutorsService} from '../../../services/executors.service';

describe('Manufacturing', () => {
  let component: Manufacturing;
  let fixture: ComponentFixture<Manufacturing>;
  let mockManufacturingService: jasmine.SpyObj<ManufacturingService>;
  let mockExecutorsService: jasmine.SpyObj<ExecutorsService>;

  beforeEach(async () => {
    mockManufacturingService = jasmine.createSpyObj('ManufacturingService', ['getAvailability']);
    mockExecutorsService = jasmine.createSpyObj('ExecutorsService', ['getList']);
    await TestBed.configureTestingModule({
      imports: [Manufacturing],
      providers: [
        provideZonelessChangeDetection(),
        {provide: ManufacturingService, useValue: mockManufacturingService},
        {provide: ExecutorsService, useValue: mockExecutorsService},
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(Manufacturing);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
