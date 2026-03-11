import { Injectable } from '@angular/core';
import { AbstractCollection, Deletable } from './abstract.collection';
import { OrderByDirection, QueryDocumentSnapshot, SnapshotOptions } from '@firebase/firestore';

export interface ReserveItem {
  positionId: string;
  supplyId: string;
  lot: string | number;
  quantity: number;
  name?: string;
  usedQuantity?: number;
  brokenQuantity?: number;
  returnedQuantity?: number;
}

export interface Reserve extends Deletable {
  date: Date;
  quantity: number;
  items: ReserveItem[];
  producedQuantity?: number;
  returnedQuantity?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReserveCollection extends AbstractCollection<Reserve> {
  protected override collectionName = 'reserves';

  public override async getList(
    orderField = 'date',
    orderDirection: OrderByDirection = 'asc',
  ): Promise<Reserve[]> {
    return super.getList(orderField, orderDirection);
  }

  protected override getConverter() {
    const converter = super.getConverter()!;
    converter.fromFirestore = (
      snapshot: QueryDocumentSnapshot,
      options?: SnapshotOptions,
    ): Reserve => {
      const data = snapshot.data(options) as Reserve;
      return {
        ...data,
        id: snapshot.id,
        date: new Date((data.date as any).seconds * 1000),
      };
    };
    return converter;
  }
}
