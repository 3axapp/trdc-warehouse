import {Component, inject, INJECTOR, OnInit, signal} from '@angular/core';
import {TuiAlertService, TuiButton, tuiDialog} from '@taiga-ui/core';
import {PositionsCollection} from '../../../services/collections/positions.collection';
import {Executor, ExecutorsCollection} from '../../../services/collections/executors.collection';
import {AvailabilityResult, ManufacturingService, Recipe} from '../../../services/manufacturing.service';
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
      this.manufacturing.getAvailability(this.recipe),
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
        await this.manufacturing.create(this.recipe, data);
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
    if (!this.recipe.id) {
      return;
    }
    this.data.set(
      await this.manufacturingProduction.getList().then(list => list.filter(i => i.positionId == this.recipe.id)));
  }
}
