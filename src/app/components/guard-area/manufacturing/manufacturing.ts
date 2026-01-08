import {Component, inject, INJECTOR, OnInit, signal} from '@angular/core';
import {TuiAlertService, TuiButton, tuiDialog} from '@taiga-ui/core';
import {PositionsCollection, PositionType} from '../../../services/collections/positions.collection';
import {Executor, ExecutorsCollection} from '../../../services/collections/executors.collection';
import {AvailabilityResult, ManufacturingService, Receipt} from '../../../services/manufacturing.service';
import {Observable} from 'rxjs';
import {Options, Result} from './manufacturing-form/manufacturing-form';
import {where} from '@angular/fire/firestore';
import {
  TuiTableCell,
  TuiTableDirective,
  TuiTableTbody,
  TuiTableTd,
  TuiTableTh,
  TuiTableThGroup,
  TuiTableTr,
} from '@taiga-ui/addon-table';
import {DatePipe, NgFor} from '@angular/common';
import {
  ManufacturingProductionCollection,
  ProductionItem,
} from '../../../services/collections/manufacturing-production.collection';

const receipt: Receipt = {
  code: 'chip',
  items: [
    {type: PositionType.Normal, code: 'body', quantity: 1},
    {type: PositionType.Normal, code: 'membrane', quantity: 1},
    {type: PositionType.Normal, code: 'bottom_lid', quantity: 1},
    {type: PositionType.Normal, code: 'top_lid', quantity: 1},
    {type: PositionType.Normal, code: 'tape_3M', quantity: 1},
  ],
};

@Component({
  selector: 'app-manufacturing',
  imports: [
    DatePipe,
    TuiButton,
    TuiTableCell,
    TuiTableDirective,
    TuiTableTbody,
    TuiTableTd,
    TuiTableTh,
    TuiTableThGroup,
    TuiTableTr,
    NgFor,
  ],
  templateUrl: './manufacturing.html',
  styleUrl: './manufacturing.scss',
})
export class Manufacturing implements OnInit {
  private readonly injector = inject(INJECTOR);
  private readonly manufacturing = inject(ManufacturingService);
  private readonly executors = inject(ExecutorsCollection);
  private readonly manufacturingProduction = inject(ManufacturingProductionCollection);
  private readonly positions = inject(PositionsCollection);
  private readonly alerts = inject(TuiAlertService);

  protected block = signal(false);
  protected data = signal<ProductionItem[]>([]);
  protected columns = ['date', 'executorId', 'lot', 'quantity'];

  public async ngOnInit() {
    receipt.id = await this.positions.getList('name', 'asc', where('code', '==', receipt.code))
      .then(list => list[0]?.id);
    await this.load();
  }

  protected async add() {
    this.block.set(true);
    const [executors, availability] = await Promise.all([
      this.executors.getList(),
      this.manufacturing.getAvailability(receipt),
    ]);

    if (availability.available === 0) {
      this.alerts.open(availability.message).subscribe();
      this.block.set(false);
      return;
    }

    await this.showDialog(availability, executors);
  }

  private async showDialog(availability: AvailabilityResult, executors: Executor[]) {
    const dialog = await this.lazyLoad();

    dialog({executors, availability}).subscribe({
      next: async (data) => {
        await this.manufacturing.create(receipt, data);
        await this.load();
        console.info(`Dialog emitted data = `, data);
      },
      complete: () => {
        console.info('Dialog closed');
        this.block.set(false);
      },
    });
  }

  private async lazyLoad(): Promise<(options: Options) => Observable<Result>> {
    const {ManufacturingForm} = await import('./manufacturing-form/manufacturing-form');

    return tuiDialog(ManufacturingForm, {
      injector: this.injector,
      dismissible: true,
      label: 'Создать',
    });
  }

  private async load() {
    if (!receipt.id) {
      return;
    }
    this.data.set(await this.manufacturingProduction.getList().then(list => list.filter(i => i.positionId == receipt.id)));
  }
}
