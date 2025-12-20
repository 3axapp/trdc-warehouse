import {Pipe, PipeTransform} from '@angular/core';
import {QualityControlStatus} from '../services/supplies.service';
import {Position, PositionType} from '../services/positions.service';

@Pipe({
  name: 'qualityControlStatus',
})
export class QualityControlStatusPipe implements PipeTransform {
  private names = {
    [QualityControlStatus.Pending]: 'Ожидает',
    [QualityControlStatus.Completed]: 'Обработан',
  };

  transform(value: QualityControlStatus, position: Position): string {
    if (!position || position.type !== PositionType.Checked) {
      return '';
    }
    value = value || QualityControlStatus.Pending;
    if (!this.names[value]) {
      return 'Неизвестно';
    }
    return this.names[value];
  }

}
