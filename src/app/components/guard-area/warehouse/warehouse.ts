import {Component} from '@angular/core';
import {TuiButton} from '@taiga-ui/core';

@Component({
  selector: 'app-warehouse',
  imports: [
    TuiButton,
  ],
  templateUrl: './warehouse.html',
  styleUrl: './warehouse.scss',
})
export class Warehouse {

  protected columns = [
    'id',
    'position_name',
    'supplier_name',
    'quantity',
    'broken_quantity',
    'remaining_quantity',
    'quality_control_status',
    'lot',
  ];

  protected new() {

  }
}
