import {Component, inject, INJECTOR, OnInit, signal} from '@angular/core';
import {TuiTable} from '@taiga-ui/addon-table';
import {Position, PositionsService} from '../../../services/positions.service';
import {TuiAlertService, TuiButton, tuiDialog, TuiHint, TuiIcon} from '@taiga-ui/core';
import {Observable, switchMap} from 'rxjs';
import {NgForOf} from '@angular/common';
import {PositionTypePipe} from '../../../pipes/position-type-pipe';
import {TuiResponsiveDialogService} from '@taiga-ui/addon-mobile';
import {TUI_CONFIRM, TuiConfirmData} from '@taiga-ui/kit';

@Component({
  selector: 'app-positions',
  imports: [
    TuiTable,
    TuiButton,
    TuiIcon,
    TuiHint,
    NgForOf,
    PositionTypePipe,
  ],
  templateUrl: './positions.html',
  styleUrl: './positions.scss',
})
export class Positions implements OnInit {
  private readonly injector = inject(INJECTOR);
  private positions = inject(PositionsService);
  private readonly dialogs = inject(TuiResponsiveDialogService);
  private readonly alerts = inject(TuiAlertService);

  protected columns = [
    'id',
    'code',
    'name',
    'type',
    'actions',
  ];

  protected data = signal<Position[]>([]);

  public ngOnInit(): void {
    this.load();
  }

  public async add(): Promise<void> {
    await this.showDialog();
  }

  public async edit(position: Position): Promise<void> {
    await this.showDialog(position);
  }

  public async remove(position: Position): Promise<void> {
    const data: TuiConfirmData = {
      content: `Удалить позицию "${position.name}"?`,
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
        await this.positions.archive(position.id);
        await this.load();
        return this.alerts.open('Позиция удалена');
      }))
      .subscribe();
  }

  public async restore(position: Position): Promise<void> {
    const data: TuiConfirmData = {
      content: `Восстановить позицию "${position.name}"?`,
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
        await this.positions.unarchive(position.id);
        await this.load();
        return this.alerts.open('Позиция восстановлена');
      }))
      .subscribe();
  }

  protected async showDialog(position?: Position): Promise<void> {
    const dialog = await this.lazyLoad(position);

    dialog(position).subscribe({
      next: async (data) => {
        await this.load();
        console.info(`Dialog emitted data = `, data);
      },
      complete: () => {
        console.info('Dialog closed');
      },
    });
  }

  private async lazyLoad(position?: Position): Promise<(position?: Position) => Observable<Position>> {
    const {PositionForm} = await import('./position-form/position-form');

    return tuiDialog(PositionForm, {
      injector: this.injector,
      dismissible: true,
      label: position ? 'Изменить' : 'Добавить',
    });
  }

  private async load(): Promise<void> {
    return this.positions.getList().then(positions => {
      this.data.set(positions.sort((a, b) => (a.deleted ? 1 : 0) - (b.deleted ? 1 : 0)));
    });
  }
}
