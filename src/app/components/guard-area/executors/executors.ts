import {Component, inject, INJECTOR, OnInit, signal} from '@angular/core';
import {TuiResponsiveDialogService} from '@taiga-ui/addon-mobile';
import {TuiAlertService, TuiButton, tuiDialog, TuiHintDirective, TuiIcon} from '@taiga-ui/core';
import {TUI_CONFIRM, TuiConfirmData} from '@taiga-ui/kit';
import {Observable, switchMap} from 'rxjs';
import {Executor, ExecutorsCollection} from '../../../services/collections/executors.collection';
import {NgForOf} from '@angular/common';
import {
  TuiTableCell,
  TuiTableDirective,
  TuiTableTbody,
  TuiTableTd,
  TuiTableTh,
  TuiTableThGroup,
  TuiTableTr,
} from '@taiga-ui/addon-table';

@Component({
  selector: 'app-executors',
  imports: [
    NgForOf,
    TuiButton,
    TuiHintDirective,
    TuiIcon,
    TuiTableCell,
    TuiTableDirective,
    TuiTableTbody,
    TuiTableTd,
    TuiTableTh,
    TuiTableThGroup,
    TuiTableTr,
  ],
  templateUrl: './executors.html',
  styleUrl: './executors.scss',
})
export class Executors implements OnInit {
  private readonly injector = inject(INJECTOR);
  private executors = inject(ExecutorsCollection);
  private readonly dialogs = inject(TuiResponsiveDialogService);
  private readonly alerts = inject(TuiAlertService);

  protected columns = [
    'name',
    'actions',
  ];

  protected data = signal<Executor[]>([]);

  public ngOnInit(): void {
    this.load();
  }

  public async add(): Promise<void> {
    await this.showDialog();
  }

  public async edit(executor: Executor): Promise<void> {
    await this.showDialog(executor);
  }

  public async remove(executor: Executor): Promise<void> {
    const data: TuiConfirmData = {
      content: `Удалить исполнителя "${executor.name}"?`,
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
        await this.executors.archive(executor.id);
        await this.load();
        return this.alerts.open('Исполнитель удален');
      }))
      .subscribe();
  }

  public async restore(executor: Executor): Promise<void> {
    const data: TuiConfirmData = {
      content: `Восстановить исполнителя "${executor.name}"?`,
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
        await this.executors.unarchive(executor.id);
        await this.load();
        return this.alerts.open('Исполнитель восстановлен');
      }))
      .subscribe();
  }

  protected async showDialog(executor?: Executor): Promise<void> {
    const dialog = await this.lazyLoad(executor);

    dialog(executor).subscribe({
      next: async (data) => {
        if (executor?.id) {
          await this.executors.update(executor.id, data);
        } else {
          await this.executors.add(data);
        }
        await this.load();
        console.info(`Dialog emitted data = `, data);
      },
      complete: () => {
        console.info('Dialog closed');
      },
    });
  }

  private async lazyLoad(executor?: Executor): Promise<(supplier?: Executor) => Observable<Executor>> {
    const {ExecutorForm} = await import('./executor-form/executor-form');

    return tuiDialog(ExecutorForm, {
      injector: this.injector,
      dismissible: true,
      label: executor ? 'Изменить' : 'Добавить',
    });
  }

  private async load(): Promise<void> {
    return this.executors.getList().then(suppliers => {
      this.data.set(suppliers.sort((a, b) => (a.deleted ? 1 : 0) - (b.deleted ? 1 : 0)));
    });
  }
}
