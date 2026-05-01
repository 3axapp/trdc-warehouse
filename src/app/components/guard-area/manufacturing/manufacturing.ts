import { Component, inject, INJECTOR, OnInit, signal } from '@angular/core';
import { TuiAlertService, TuiButton, tuiDialog, TuiHintDirective, TuiIcon } from '@taiga-ui/core';
import {
  PositionsCollection,
  PositionType,
} from '../../../services/collections/positions.collection';
import {
  ExtraFieldKeys,
  findReceiptPositions,
  ManufacturingService,
  NextMaxQuantity,
  Recipe,
  RecipeItem,
} from '../../../services/manufacturing.service';
import { ManufacturingForm } from './manufacturing-form/manufacturing-form';
import {
  TuiTableCell,
  TuiTableDirective,
  TuiTableTbody,
  TuiTableTd,
  TuiTableTh,
  TuiTableThGroup,
  TuiTableTr,
} from '@taiga-ui/addon-table';
import { AsyncPipe, DatePipe } from '@angular/common';
import {
  ManufacturingProductionCollection,
  ProductionItem,
} from '../../../services/collections/manufacturing-production.collection';
import { CacheService } from '../../../services/cache.service';
import { ExecutorPipe } from '../../../pipes/executor-pipe';
import { ActivatedRoute } from '@angular/router';
import {
  ManufacturingSuccess,
  ManufacturingSuccessOptions,
} from './manufacturing-success/manufacturing-success';
import { UsedLot } from '../../../services/manufacturing/combination';
import { UsersCollection } from '../../../services/collections/users.collection';
import { AuthService } from '../../../services/auth.service';

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
  ],
  templateUrl: './manufacturing.html',
  styleUrl: './manufacturing.scss',
})
export class Manufacturing implements OnInit {
  private readonly injector = inject(INJECTOR);
  private readonly manufacturing = inject(ManufacturingService);
  private readonly executors = inject(UsersCollection);
  private readonly manufacturingProduction = inject(ManufacturingProductionCollection);
  private readonly positions = inject(PositionsCollection);
  private readonly cache = inject(CacheService);
  private readonly alerts = inject(TuiAlertService);
  protected readonly recipe = inject(ActivatedRoute).snapshot.data['recipe'] as Recipe;
  private readonly auth = inject(AuthService);

  protected block = signal(false);
  protected data = signal<ProductionItem[]>([]);
  protected columns = [
    'date',
    'executorId',
    'recipient',
    'docNumber',
    'lot',
    'quantity',
    'controls',
  ];

  public async ngOnInit() {
    this.cache.add('executors', this.executors.getList());
    if (!this.recipe.extraFields?.recipient) {
      this.columns = this.columns.filter((v) => v != 'recipient');
    }
    if (!this.recipe.extraFields?.docNumber) {
      this.columns = this.columns.filter((v) => v != 'docNumber');
    }
    if (!this.recipe.id) {
      const list = await this.positions.getList();
      findReceiptPositions(this.recipe, list);
    }
    await this.load();
  }

  protected async add() {
    this.block.set(true);
    const availability = await this.manufacturing.getNextMaxQuantity(this.recipe);

    if (availability.available === 0) {
      this.alerts.open(availability.message).subscribe();
      this.block.set(false);
      return;
    }

    await this.showDialog(availability);
  }

  protected showParts(item: ProductionItem) {
    const usedLots: UsedLot[] = [];
    const add = (part: RecipeItem, quantity: number, lot?: string | number) => {
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
      let currentLot: string | number | undefined;
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
    const extraFields: Partial<Record<ExtraFieldKeys, { value: any }>> = {};
    for (const [name, enable] of Object.entries(this.recipe.extraFields || {})) {
      if (!enable) {
        continue;
      }
      extraFields[name as ExtraFieldKeys] = { value: (item as any)[name] };
    }
    this.showSuccess({
      usedLots,
      date: item.date,
      executorId: item.executorId,
      extraFields,
      lot: String(item.lot),
    });
  }

  private async showDialog(availability: NextMaxQuantity) {
    const dialog = tuiDialog(ManufacturingForm, {
      injector: this.injector,
      dismissible: true,
      label: 'Создать',
    });

    dialog({
      executorId: this.auth.getIdentity()!.id,
      availability,
      extraFields: this.recipe.extraFields,
    }).subscribe({
      next: async (data) => {
        try {
          const result = await this.manufacturing.create(this.recipe, data);
          for (const part of this.recipe.items) {
            if (part.type === PositionType.Normal) {
              result.usedLots.push({
                supplyId: '',
                name: part.name,
                taken: data.quantity * part.quantity,
                originalTaken: data.quantity * part.quantity,
              });
            }
          }
          const extraFields: Partial<Record<ExtraFieldKeys, { value: any }>> = {};
          for (const [name, enable] of Object.entries(this.recipe.extraFields || {})) {
            if (!enable) {
              continue;
            }
            extraFields[name as ExtraFieldKeys] = { value: (data as any)[name] };
          }
          this.showSuccess({
            usedLots: result.usedLots,
            date: data.date,
            executorId: data.executorId,
            extraFields,
            lot: result.lot,
          });
          await this.load();
        } catch (e: any) {
          this.alerts.open(e.message || e, { appearance: 'negative' }).subscribe();
        }
      },
      complete: () => {
        this.block.set(false);
      },
    });
  }

  private async load() {
    if (!this.recipe.id) {
      return;
    }
    this.data.set(
      await this.manufacturingProduction
        .getList()
        .then((list) => list.filter((i) => i.positionId == this.recipe.id)),
    );
  }

  private showSuccess(options: ManufacturingSuccessOptions) {
    const dialog = tuiDialog(ManufacturingSuccess, {
      injector: this.injector,
      dismissible: true,
      label: `Состав лота "${options.lot}"`,
    });
    dialog(options).subscribe();
  }
}
