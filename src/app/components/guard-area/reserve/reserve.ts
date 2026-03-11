import { Component, inject, INJECTOR, OnInit, signal } from '@angular/core';
import { TuiAlertService, TuiButton, tuiDialog, TuiHintDirective, TuiIcon } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiConfirmData } from '@taiga-ui/kit';
import { TuiResponsiveDialogService } from '@taiga-ui/addon-mobile';
import { switchMap } from 'rxjs';
import {
  TuiTableCell,
  TuiTableDirective,
  TuiTableExpand,
  TuiTableTbody,
  TuiTableTd,
  TuiTableTh,
  TuiTableThGroup,
  TuiTableTr,
} from '@taiga-ui/addon-table';
import { DatePipe } from '@angular/common';
import { Reserve, ReserveCollection } from '../../../services/collections/reserve.collection';
import { ReserveService } from '../../../services/reserve.service';
import { ReserveProductionService } from '../../../services/reserve-production.service';
import { ReserveForm } from './reserve-form/reserve-form';
import { ReserveProductionForm } from './reserve-production-form/reserve-production-form';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-reserve',
  imports: [
    TuiButton,
    TuiHintDirective,
    TuiIcon,
    TuiTableCell,
    TuiTableDirective,
    TuiTableExpand,
    TuiTableTbody,
    TuiTableTd,
    TuiTableTh,
    TuiTableThGroup,
    TuiTableTr,
    DatePipe,
  ],
  templateUrl: './reserve.html',
  styleUrl: './reserve.scss',
})
export class ReserveComponent implements OnInit {
  private readonly injector = inject(INJECTOR);
  private readonly reserveCollection = inject(ReserveCollection);
  private readonly reserveService = inject(ReserveService);
  private readonly reserveProductionService = inject(ReserveProductionService);
  private readonly alerts = inject(TuiAlertService);
  private readonly dialogs = inject(TuiResponsiveDialogService);
  private readonly authService = inject(AuthService);

  protected readonly columns = ['expand', 'date', 'quantity', 'producedQuantity', 'actions'];
  protected data = signal<Reserve[]>([]);
  protected readonly expandedIds = signal<Set<string>>(new Set());

  public async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  protected toggleExpand(id: string): void {
    const next = new Set(this.expandedIds());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedIds.set(next);
  }

  protected canProductionConfirmed(reserve: Reserve): boolean {
    return this.reserveProductionService.canProductionConfirmed(reserve);
  }

  protected canReturnRemainder(reserve: Reserve): boolean {
    return this.reserveProductionService.canReturnRemainder(reserve);
  }

  protected async add(): Promise<void> {
    let availability;
    try {
      availability = await this.reserveService.getMaxQuantity();
    } catch (e: any) {
      this.alerts.open(e.message || e, { appearance: 'negative' }).subscribe();
      return;
    }

    if (availability.available === 0) {
      this.alerts.open(availability.message ?? 'Недостаточно материалов').subscribe();
      return;
    }

    const dialog = tuiDialog(ReserveForm, {
      injector: this.injector,
      dismissible: true,
      label: 'Новый резерв',
    });

    dialog({ available: availability.available }).subscribe({
      next: async (quantity) => {
        try {
          await this.reserveService.createReserve(quantity);
          await this.load();
        } catch (e: any) {
          this.alerts.open(e.message || e, { appearance: 'negative' }).subscribe();
        }
      },
    });
  }

  protected async openConfirmProduction(reserve: Reserve): Promise<void> {
    const dialog = tuiDialog(ReserveProductionForm, {
      injector: this.injector,
      dismissible: true,
      label: 'Подтверждение производства',
    });

    dialog({
      reserve,
      maxQuantity: this.reserveProductionService.getNextMaxQuantity(reserve),
    }).subscribe({
      next: async (data) => {
        try {
          await this.reserveProductionService.confirmProduction(
            reserve.id,
            data,
            this.authService.getIdentity()!.uid,
          );
          await this.load();
        } catch (e: any) {
          this.alerts.open(e.message || e, { appearance: 'negative' }).subscribe();
        }
      },
    });
  }

  protected returnRemainder(reserve: Reserve): void {
    const data: TuiConfirmData = {
      content: 'Вернуть остаток материалов из резерва на склад?',
      yes: 'Да',
      no: 'Нет',
    };

    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: 'Подтвердите',
        size: 's',
        data,
      })
      .pipe(
        switchMap(async (response) => {
          if (!response) {
            return;
          }
          try {
            await this.reserveProductionService.returnRemainder(reserve);
            await this.load();
          } catch (e: any) {
            this.alerts.open(e.message || e, { appearance: 'negative' }).subscribe();
          }
        }),
      )
      .subscribe();
  }

  private async load(): Promise<void> {
    await this.reserveService.ensureRecipeLoaded();
    this.data.set((await this.reserveCollection.getList()).filter((r) => !r.deleted));
  }
}
