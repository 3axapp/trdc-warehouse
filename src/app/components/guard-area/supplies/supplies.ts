import { Component, inject, OnInit, signal } from '@angular/core';
import { SuppliesCollection, Supply } from '../../../services/collections/supplies.collection';
import { AsyncPipe, DatePipe } from '@angular/common';
import {
  TuiTableCell,
  TuiTableDirective,
  TuiTableTbody,
  TuiTableTd,
  TuiTableTh,
  TuiTableThGroup,
  TuiTableTr,
} from '@taiga-ui/addon-table';
import { PositionPipe } from '../../../pipes/position-pipe';
import { SupplierPipe } from '../../../pipes/supplier-pipe';
import { CacheService } from '../../../services/cache.service';
import {
  PositionsCollection,
  PositionType,
} from '../../../services/collections/positions.collection';
import { SuppliersCollection } from '../../../services/collections/suppliers.collection';
import { ExecutorPipe } from '../../../pipes/executor-pipe';
import { UsersCollection } from '../../../services/collections/users.collection';

@Component({
  selector: 'app-warehouse',
  imports: [
    TuiTableCell,
    TuiTableDirective,
    TuiTableTbody,
    TuiTableTd,
    TuiTableTh,
    TuiTableThGroup,
    TuiTableTr,
    AsyncPipe,
    DatePipe,
    ExecutorPipe,
    PositionPipe,
    SupplierPipe,
  ],
  templateUrl: './supplies.html',
  styleUrl: './supplies.scss',
})
export class Supplies implements OnInit {
  private readonly cache = inject(CacheService);
  private readonly positions = inject(PositionsCollection);
  private readonly supplies = inject(SuppliesCollection);
  private readonly suppliers = inject(SuppliersCollection);
  private readonly users = inject(UsersCollection);

  protected columns = [
    'positionId',
    // 'positionCode',
    'supplierId',
    'date',
    'quantity',
    'usedQuantity',
    'remainingQuantity',
    'lot',
    // 'actions',
  ];

  protected readonly PositionType = PositionType;

  protected data = signal<Supply[]>([]);

  public ngOnInit(): void {
    this.cache.add('suppliers', this.suppliers.getList());
    this.cache.add('positions', this.positions.getList());
    this.cache.add('executors', this.users.getList());
    this.load();
  }

  private async load(): Promise<void> {
    return this.supplies.getList().then((supplies) => {
      this.data.set(supplies.sort((a, b) => (a.deleted ? 1 : 0) - (b.deleted ? 1 : 0)));
    });
  }
}
