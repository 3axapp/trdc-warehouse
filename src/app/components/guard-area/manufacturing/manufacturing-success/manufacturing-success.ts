import {Component} from '@angular/core';
import {injectContext} from '@taiga-ui/polymorpheus';
import {TuiDialogContext} from '@taiga-ui/core';
import {UsedLot} from '../../../../services/manufacturing/combination';
import {TuiTableDirective, TuiTableTbody, TuiTableTh, TuiTableThGroup, TuiTableTr} from '@taiga-ui/addon-table';
import {NgFor} from '@angular/common';

@Component({
  selector: 'app-manufacturing-success',
  imports: [
    TuiTableDirective,
    TuiTableTbody,
    TuiTableTh,
    TuiTableThGroup,
    TuiTableTr,
    NgFor,
  ],
  templateUrl: './manufacturing-success.html',
  styleUrl: './manufacturing-success.scss',
})
export class ManufacturingSuccess {

  public readonly context = injectContext<TuiDialogContext<void, UsedLot[]>>();

  protected columns = ['name', 'lot', 'originalTaken'];

  protected get data() {
    return this.context.data;
  }
}
