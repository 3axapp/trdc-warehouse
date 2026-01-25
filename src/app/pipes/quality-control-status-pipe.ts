import {Pipe, PipeTransform} from '@angular/core';
import {QualityControlStatus} from '../services/collections/supplies.collection';

@Pipe({
  name: 'qualityControlStatus',
})
export class QualityControlStatusPipe implements PipeTransform {
  private names = {
    [QualityControlStatus.Pending]: 'Ожидает контроля',
    [QualityControlStatus.Completed]: 'Прошел контроль',
  };

  transform(value: QualityControlStatus): string {
    value = value || QualityControlStatus.Pending;
    if (!this.names[value]) {
      return 'Неизвестно';
    }
    return this.names[value];
  }

}
