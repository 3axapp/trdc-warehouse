import {Injectable} from '@angular/core';
import {AbstractCollection, Deletable} from './abstract-collection';

@Injectable({
  providedIn: 'root',
})
export class PositionsService extends AbstractCollection<Position> {
  protected override collectionName = 'positions';
}

export enum PositionType {
  Normal = 1, // обычный
  Checked = 2, // проверяемый
  Produced = 3, // производимый
}

export interface Position extends Deletable {
  name: string;
  type: PositionType;
}
