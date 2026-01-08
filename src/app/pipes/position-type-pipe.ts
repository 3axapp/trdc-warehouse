import {Pipe, PipeTransform} from '@angular/core';
import {PositionType} from '../services/collections/positions.collection';

@Pipe({
  name: 'positionType',
})
export class PositionTypePipe implements PipeTransform {

  private names = {
    [PositionType.Normal]: 'Обычный',
    [PositionType.Checked]: 'Проверяемый',
    [PositionType.Produced]: 'Производимый',
  };

  transform(value?: PositionType): string {
    if (!value || !this.names[value]) {
      return 'Неизвестно';
    }
    return this.names[value];
  }

}
