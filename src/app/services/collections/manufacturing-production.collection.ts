import {Injectable} from '@angular/core';
import {AbstractCollection, Deletable} from './abstract.collection';
import {
  DocumentData,
  FirestoreDataConverter,
  OrderByDirection,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from '@firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class ManufacturingProductionCollection extends AbstractCollection<ProductionItem> {
  protected override collectionName = 'manufacturingProduction';

  public override async getList(
    orderField: string = 'date', orderDirection: OrderByDirection = 'desc'
  ): Promise<ProductionItem[]> {
    return super.getList(orderField, orderDirection);
  }

  protected override getConverter(): FirestoreDataConverter<ProductionItem, DocumentData> {
    const converter = super.getConverter();
    converter.fromFirestore = (snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): ProductionItem => {
      const data = snapshot.data(options) as ProductionItem;
      return {
        ...data,
        id: snapshot.id,
        date: new Date((data.date as any).seconds * 1000),
      };
    };
    return converter;
  }
}

export interface ProductionItem extends Deletable {
  date: Date;
  executorId: string;
  quantity: number;
  supplyId: string;
  positionId: string;
  lot: number;
  parts: (string | number)[];
  recipient?: string;
}
