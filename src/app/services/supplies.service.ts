import {inject, Injectable} from '@angular/core';
import {AbstractCollection, Deletable} from './abstract-collection';
import {OrderByDirection, QueryDocumentSnapshot, SnapshotOptions} from '@firebase/firestore';
import {Auth} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class SuppliesService extends AbstractCollection<Supply> {
  protected override collectionName = 'supplies';

  public override async getList(
    orderField: string = 'date', orderDirection: OrderByDirection = 'desc'): Promise<Supply[]> {
    return super.getList(orderField, orderDirection);
  }

  protected override getConverter() {
    const converter = super.getConverter()!;
    converter.fromFirestore = (
      snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): Supply => {
      const data = snapshot.data(options) as Supply;
      return {
        ...data,
        id: snapshot.id,
        date: new Date((data.date as any).seconds * 1000),
        qualityControlDate: data.qualityControlDate
          ? new Date((data.qualityControlDate as any).seconds * 1000)
          : data.qualityControlDate,
      };
    };
    return converter;
  }
}

export interface Supply extends Deletable {
  positionId: string;
  supplierId?: string;
  date: Date;
  quantity: number;
  brokenQuantity: number;
  usedQuantity: number;
  qualityControlDate?: Date;
  qualityControlUserId?: string;
  qualityControlStatus?: QualityControlStatus;
  lot?: number;
}

export enum QualityControlStatus {
  Pending,
  Completed,
}
