import {Injectable} from '@angular/core';
import {AbstractCollection, Deletable} from './abstract-collection';
import {OrderByDirection} from '@firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class SuppliesService extends AbstractCollection<Supply> {
  protected override collectionName = 'supplies';

  public override async getList(orderField: string = 'date', orderDirection: OrderByDirection = 'desc'): Promise<Supply[]> {
    return super.getList(orderField, orderDirection).then(supplies => supplies.map(supply => ({
      ...supply,
      date: new Date((supply.date as any).seconds * 1000),
    })));
  }
}

export interface Supply extends Deletable {
  name: string;
  positionId: string;
  supplierId: string;
  date: Date;
  quantity: number;
  brokenQuantity: number;
  remainingQuantity: number;
  qualityControlStatus: QualityControlStatus;
  lot: string;
}

export enum QualityControlStatus {
  Pending,
  Completed,
}
