import {Component, inject, INJECTOR, OnInit, signal} from '@angular/core';
import {TuiAlertService, TuiButton, tuiDialog, TuiHintDirective, TuiIcon} from '@taiga-ui/core';
import {TUI_CONFIRM, TuiConfirmData} from '@taiga-ui/kit';
import {Observable, switchMap} from 'rxjs';
import {TuiResponsiveDialogService} from '@taiga-ui/addon-mobile';
import {QualityControlStatus, SuppliesCollection, Supply} from '../../../services/collections/supplies.collection';
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
import {QualityControlStatusPipe} from '../../../pipes/quality-control-status-pipe';
import {PositionPipe} from '../../../pipes/position-pipe';
import {SupplierPipe} from '../../../pipes/supplier-pipe';
import {CacheService} from '../../../services/cache.service';
import {PositionsCollection, PositionType} from '../../../services/collections/positions.collection';
import {SuppliersCollection} from '../../../services/collections/suppliers.collection';

@Component({
  selector: 'app-warehouse',
  imports: [
    TuiButton,
    NgForOf,
    TuiHintDirective,
    TuiIcon,
    TuiTableCell,
    TuiTableDirective,
    TuiTableTbody,
    TuiTableTd,
    TuiTableTh,
    TuiTableThGroup,
    TuiTableTr,
    QualityControlStatusPipe,
    PositionPipe,
    SupplierPipe,
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

  protected readonly PositionType = PositionType;

  protected readonly QualityControlStatus = QualityControlStatus;

  protected columns = [
    'positionId',
    'positionCode',
    'supplierId',
    'date',
    'quantity',
    'usedQuantity',
    'brokenQuantity',
    'remainingQuantity',
    'qualityControlStatus',
    'lot',
    'actions',
  ];

  protected data = signal<Supply[]>([]);

  public ngOnInit(): void {
    this.cache.add('suppliers', this.suppliers.getList());
    this.cache.add('positions', this.positions.getList());
    this.load();
  }

  public async add(): Promise<void> {
    await this.showDialog();
  }

  public async edit(supply: Supply): Promise<void> {
    await this.showDialog(supply);
  }

  public async remove(supply: Supply): Promise<void> {
    const data: TuiConfirmData = {
      content: `Удалить поставку "${supply.id}"?`,
      yes: 'Да',
      no: 'Нет',
    };

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: 'Подтвердите',
        size: 's',
        data,
      })
      .pipe(switchMap(async (response) => {
        if (!response) {
          return;
        }
        await this.supplies.archive(supply.id);
        await this.load();
        return this.alerts.open('Поставка удалена');
      }))
      .subscribe();
  }

  public async restore(supply: Supply): Promise<void> {
    const data: TuiConfirmData = {
      content: `Восстановить поставку "${supply.id}"?`,
      yes: 'Да',
      no: 'Нет',
    };

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: 'Подтвердите',
        size: 's',
        data,
      })
      .pipe(switchMap(async (response) => {
        if (!response) {
          return;
        }
        await this.supplies.unarchive(supply.id);
        await this.load();
        return this.alerts.open('Поставка восстановлена');
      }))
      .subscribe();
  }

  protected async showDialog(supply?: Supply): Promise<void> {
    const dialog = await this.lazyLoad(supply);

    dialog(supply).subscribe({
      next: async (data) => {
        if (supply?.id) {
          await this.supplies.update(supply.id, data);
        } else {
          data.brokenQuantity = 0;
          data.usedQuantity = 0;
          await this.supplies.add(data);
        }
        await this.load();
        console.info(`Dialog emitted data = `, data);
      },
      complete: () => {
        console.info('Dialog closed');
      },
    });
  }

  private async lazyLoad(supply?: Supply): Promise<(position?: Supply) => Observable<Supply>> {
    const {SupplyForm} = await import('./supply-form/supply-form');

    return tuiDialog(SupplyForm, {
      injector: this.injector,
      dismissible: true,
      label: supply ? 'Изменить' : 'Добавить',
    });
  }

  private async load(): Promise<void> {
    return this.supplies.getList().then(supplies => {
      this.data.set(supplies.sort((a, b) => (a.deleted ? 1 : 0) - (b.deleted ? 1 : 0)));
    });
  }

  protected async qualityControl(supply: Supply) {
    const {QualityControlForm} = await import('./quality-control-form/quality-control-form');

    const dialog = tuiDialog(QualityControlForm, {
      injector: this.injector,
      dismissible: true,
      label: 'Контроль качества',
    });

    dialog(supply).subscribe({
      next: async (data) => {
        await this.load();
        console.info(`Dialog emitted data = `, data);
      },
      complete: () => {
        console.info('Dialog closed');
      },
    });
  }
}
