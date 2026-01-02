import {Component, inject, INJECTOR, signal} from '@angular/core';
import {TuiAlertService, TuiButton, tuiDialog} from '@taiga-ui/core';
import {PositionType} from '../../../services/positions.service';
import {TuiResponsiveDialogService} from '@taiga-ui/addon-mobile';
import {Executor, ExecutorsService} from '../../../services/executors.service';
import {AvailabilityResult, ManufacturingService, Receipt} from '../../../services/manufacturing.service';
import {Observable} from 'rxjs';
import {Options, Result} from './manufacturing-form/manufacturing-form';

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
    TuiButton,
  ],
  templateUrl: './manufacturing.html',
  styleUrl: './manufacturing.scss',
})
export class Manufacturing {
  private readonly injector = inject(INJECTOR);
  private manufacturing = inject(ManufacturingService);
  private executors = inject(ExecutorsService);
  private readonly dialogs = inject(TuiResponsiveDialogService);
  private readonly alerts = inject(TuiAlertService);
  protected block = signal(false);

  protected async add() {
    this.block.set(true);
    const [executors, availability] = await Promise.all([
      this.executors.getList(),
      this.manufacturing.getAvailability(receipt),
    ]);

    if (availability.available === 0) {
      this.alerts.open(availability.message).subscribe();
      return;
    }

    await this.showDialog(availability, executors);
  }

  private async showDialog(availability: AvailabilityResult, executors: Executor[]) {
    const dialog = await this.lazyLoad();

    dialog({executors, availability}).subscribe({
      next: async (data) => {
        await this.manufacturing.create(receipt, availability, data);
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
}
