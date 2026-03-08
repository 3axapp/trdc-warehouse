import {Component, inject, INJECTOR, OnInit, signal} from '@angular/core';
import {TuiAlertService, TuiButton, tuiDialog, TuiHintDirective, TuiIcon} from '@taiga-ui/core';
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
import {DatePipe, NgFor} from '@angular/common';
import {Reserve, ReserveCollection} from '../../../services/collections/reserve.collection';
import {ReserveService} from '../../../services/reserve.service';
import {ReserveForm} from './reserve-form/reserve-form';

@Component({
  selector: 'app-reserve',
  imports: [
    TuiButton,
    NgFor,
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
  private readonly alerts = inject(TuiAlertService);

  protected readonly columns = ['expand', 'date', 'quantity'];
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

  protected async add(): Promise<void> {
    let availability;
    try {
      availability = await this.reserveService.getMaxQuantity();
    } catch (e: any) {
      this.alerts.open(e.message || e, {appearance: 'negative'}).subscribe();
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

    dialog({available: availability.available}).subscribe({
      next: async (quantity) => {
        try {
          await this.reserveService.createReserve(quantity);
          await this.load();
        } catch (e: any) {
          this.alerts.open(e.message || e, {appearance: 'negative'}).subscribe();
        }
      },
    });
  }

  private async load(): Promise<void> {
    this.data.set((await this.reserveCollection.getList()).filter(r => !r.deleted));
  }
}
