import {Component} from '@angular/core';
import {injectContext} from '@taiga-ui/polymorpheus';
import {TuiDialogContext} from '@taiga-ui/core';
import {UsedLot} from '../../../../services/manufacturing/combination';
import {TuiTableDirective, TuiTableTbody, TuiTableTh, TuiTableThGroup, TuiTableTr} from '@taiga-ui/addon-table';
import {AsyncPipe, DatePipe, NgFor} from '@angular/common';
import {ExecutorPipe} from '../../../../pipes/executor-pipe';
import {ExtraFields} from '../../../../services/manufacturing.service';

@Component({
  selector: 'app-manufacturing-success',
  imports: [
    TuiTableDirective,
    TuiTableTbody,
    TuiTableTh,
    TuiTableThGroup,
    TuiTableTr,
    NgFor,
    DatePipe,
    ExecutorPipe,
    AsyncPipe,
  ],
  templateUrl: './manufacturing-success.html',
  styleUrl: './manufacturing-success.scss',
})
export class ManufacturingSuccess {

  public readonly context = injectContext<TuiDialogContext<void, ManufacturingSuccessOptions>>();

  protected columns = ['name', 'lot', 'originalTaken'];

  protected get data() {
    return this.context.data;
  }
}

export interface ManufacturingSuccessOptions {
  usedLots: UsedLot[];
  executorId: string;
  date: Date;
  extraFields?: Partial<Record<ExtraFields, { value: any }>>;
}
