import {Component, inject, INJECTOR, OnInit, signal} from '@angular/core';
import {TuiAlertService} from '@taiga-ui/core';
import {TuiResponsiveDialogService} from '@taiga-ui/addon-mobile';
import {SuppliesCollection, Supply} from '../../../services/collections/supplies.collection';
import {AsyncPipe, DatePipe, NgForOf} from '@angular/common';
import {
  TuiTableCell,
  TuiTableDirective,
  TuiTableTbody,
  TuiTableTd,
  TuiTableTh,
  TuiTableThGroup,
  TuiTableTr,
} from '@taiga-ui/addon-table';
import {PositionPipe} from '../../../pipes/position-pipe';
import {SupplierPipe} from '../../../pipes/supplier-pipe';
import {CacheService} from '../../../services/cache.service';
import {PositionsCollection, PositionType} from '../../../services/collections/positions.collection';
import {SuppliersCollection} from '../../../services/collections/suppliers.collection';

@Component({
  selector: 'app-warehouse',
  imports: [
    NgForOf,
    TuiTableCell,
    TuiTableDirective,
    TuiTableTbody,
    TuiTableTd,
    TuiTableTh,
    TuiTableThGroup,
    TuiTableTr,
    PositionPipe,
    SupplierPipe,
    AsyncPipe,
    DatePipe,
  ],
  templateUrl: './supplies.html',
  styleUrl: './supplies.scss',
})
export class Supplies implements OnInit {

  private readonly injector = inject(INJECTOR);
  private readonly supplies = inject(SuppliesCollection);
  private readonly positions = inject(PositionsCollection);
  private readonly suppliers = inject(SuppliersCollection);
  private readonly cache = inject(CacheService);
  private readonly dialogs = inject(TuiResponsiveDialogService);
  private readonly alerts = inject(TuiAlertService);

  protected columns = [
    'positionId',
    'positionCode',
    'supplierId',
    'date',
    'quantity',
    'usedQuantity',
    'remainingQuantity',
    'lot',
    'actions',
  ];

  protected readonly PositionType = PositionType;

  protected data = signal<Supply[]>([]);

  public ngOnInit(): void {
    this.cache.add('suppliers', this.suppliers.getList());
    this.cache.add('positions', this.positions.getList());
    this.load();
  }

  private async load(): Promise<void> {
    return this.supplies.getList().then(supplies => {
      this.data.set(supplies.sort((a, b) => (a.deleted ? 1 : 0) - (b.deleted ? 1 : 0)));
    });
  }
}
