import {Component, inject, INJECTOR, OnInit, signal} from '@angular/core';
import {TuiAlertService, TuiButton, tuiDialog, TuiDialogService} from '@taiga-ui/core';
import {PositionsCollection} from '../../../services/collections/positions.collection';
import {Executor, ExecutorsCollection} from '../../../services/collections/executors.collection';
import {ManufacturingService, NextMaxQuantity, Recipe} from '../../../services/manufacturing.service';
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
import {AsyncPipe, DatePipe, NgFor} from '@angular/common';
import {
  ManufacturingProductionCollection,
  ProductionItem,
} from '../../../services/collections/manufacturing-production.collection';
import {CacheService} from '../../../services/cache.service';
import {ExecutorPipe} from '../../../pipes/executor-pipe';
import {ActivatedRoute} from '@angular/router';
import {UsedLot} from '../../../services/manufacturing/combination';
import {ManufacturingSuccess} from './manufacturing-success/manufacturing-success';

@Component({
  selector: 'app-manufacturing',
  imports: [
    DatePipe,
    ExecutorPipe,
    AsyncPipe,
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
  private readonly cache = inject(CacheService);
  private readonly alerts = inject(TuiAlertService);
  private readonly recipe = inject(ActivatedRoute).snapshot.data['recipe'] as Recipe;
  private readonly dialogs = inject(TuiDialogService);

  protected block = signal(false);
  protected data = signal<ProductionItem[]>([]);
  protected columns = ['date', 'executorId', 'lot', 'quantity'];

  public async ngOnInit() {
    this.cache.add('executors', this.executors.getList());
    if (!this.recipe.id) {
      this.recipe.id = await this.positions.getList('name', 'asc', where('code', '==', this.recipe.code))
        .then(list => list[0]?.id);
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

  private async showDialog(availability: NextMaxQuantity, executors: Executor[]) {
    const dialog = await this.lazyLoad();

    dialog({executors, availability}).subscribe({
      next: async (data) => {
        try {
          const usedLots = await this.manufacturing.create(this.recipe, data);
          this.showSuccess(usedLots);
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

  private showSuccess(usedLots: UsedLot[]) {
    const dialog = tuiDialog(ManufacturingSuccess, {
      injector: this.injector,
      dismissible: true,
      label: 'Снова успех! Материалы',
    });
    dialog(usedLots).subscribe();
  }
}
