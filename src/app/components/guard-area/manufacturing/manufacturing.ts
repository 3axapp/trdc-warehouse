import {Component, inject, INJECTOR, OnInit, signal} from '@angular/core';
import {TuiAlertService, TuiButton, tuiDialog, TuiDialogService, TuiHintDirective, TuiIcon} from '@taiga-ui/core';
import {Position, PositionsCollection, PositionType} from '../../../services/collections/positions.collection';
import {Executor, ExecutorsCollection} from '../../../services/collections/executors.collection';
import {
  findReceiptPositions,
  ManufacturingService,
  NextMaxQuantity,
  Recipe,
  RecipeItem,
} from '../../../services/manufacturing.service';
import {Observable} from 'rxjs';
import {Options, Result} from './manufacturing-form/manufacturing-form';
import {
  TuiTableCell,
  TuiTableDirective,
  TuiTableTbody,
  TuiTableTd,
  TuiTableTh,
  TuiTableThGroup,
  TuiTableTr,
} from '@taiga-ui/addon-table';
import {AsyncPipe, DatePipe, NgFor} from '@angular/common';
import {
  ManufacturingProductionCollection,
  ProductionItem,
} from '../../../services/collections/manufacturing-production.collection';
import {CacheService} from '../../../services/cache.service';
import {ExecutorPipe} from '../../../pipes/executor-pipe';
import {ActivatedRoute} from '@angular/router';
import {ManufacturingSuccess, ManufacturingSuccessOptions} from './manufacturing-success/manufacturing-success';
import {UsedLot} from '../../../services/manufacturing/combination';

@Component({
  selector: 'app-manufacturing',
  imports: [
    DatePipe,
    ExecutorPipe,
    AsyncPipe,
    TuiButton,
    TuiIcon,
    TuiHintDirective,
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
  private readonly cache = inject(CacheService);
  private readonly alerts = inject(TuiAlertService);
  private readonly recipe = inject(ActivatedRoute).snapshot.data['recipe'] as Recipe;
  private readonly dialogs = inject(TuiDialogService);

  protected block = signal(false);
  protected data = signal<ProductionItem[]>([]);
  protected columns = ['date', 'executorId', 'lot', 'quantity', 'controls'];

  public async ngOnInit() {
    this.cache.add('executors', this.executors.getList());
    if (!this.recipe.id) {
      const list = await this.positions.getList();
      findReceiptPositions(this.recipe, list);
    }
    await this.load();
  }

  protected async add() {
    this.block.set(true);
    const [executors, availability] = await Promise.all([
      this.cache.getList<Executor>('executors'),
      this.manufacturing.getNextMaxQuantity(this.recipe),
    ]);

    if (availability.available === 0) {
      this.alerts.open(availability.message).subscribe();
      this.block.set(false);
      return;
    }

    await this.showDialog(availability, executors);
  }

  protected showParts(item: ProductionItem) {
    const usedLots: UsedLot[] = [];
    const add = (part: RecipeItem, quantity: number, lot?: number) => {
      usedLots.push({
        supplyId: '',
        taken: quantity,
        lot,
        originalTaken: quantity,
        name: part.name,
      });
    };
    let itemPartPosition = 0;

    for (const part of this.recipe.items) {
      if (part.type == PositionType.Normal) {
        add(part, item.quantity * part.quantity);
        continue;
      }

      let quantity = 0;
      let currentLot: number | undefined;
      for (let j = 0; j < part.quantity; j++) {
        const lot = item.parts[itemPartPosition];
        if (currentLot && currentLot != lot) {
          add(part, item.quantity * quantity, currentLot);
          quantity = 0;
        }
        currentLot = lot;
        itemPartPosition++;
        quantity++;
      }
      add(part, item.quantity * quantity, currentLot);
    }
    this.showSuccess({usedLots, date: item.date, executorId: item.executorId});
  }

  private async showDialog(availability: NextMaxQuantity, executors: Executor[]) {
    const dialog = await this.lazyLoad();

    dialog({executors, availability}).subscribe({
      next: async (data) => {
        try {
          const usedLots = await this.manufacturing.create(this.recipe, data);
          this.showSuccess({usedLots, date: data.date, executorId: data.executorId});
          await this.load();
        } catch (e: any) {
          this.alerts.open(e.message || e, {appearance: 'negative'}).subscribe();
        }
      },
      complete: () => {
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
    if (!this.recipe.id) {
      return;
    }
    this.data.set(
      await this.manufacturingProduction.getList().then(list => list.filter(i => i.positionId == this.recipe.id)));
  }

  private showSuccess(options: ManufacturingSuccessOptions) {
    const dialog = tuiDialog(ManufacturingSuccess, {
      injector: this.injector,
      dismissible: true,
      label: 'Снова успех! Материалы',
    });
    dialog(options).subscribe();
  }
}
