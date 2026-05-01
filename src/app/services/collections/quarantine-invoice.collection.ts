import { Injectable } from '@angular/core';
import { AbstractCollection, Deletable } from './abstract.collection';
import { doc, runTransaction } from '@angular/fire/firestore';
import { OrderByDirection, QueryDocumentSnapshot, SnapshotOptions } from '@firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class QuarantineInvoiceCollection extends AbstractCollection<QuarantineInvoice> {
  protected override collectionName = 'quarantineInvoices';

  private readonly lotUnique = 'quarantineInvoiceLots';

  public override async getList(
    orderField = 'date',
    orderDirection: OrderByDirection = 'desc',
  ): Promise<QuarantineInvoice[]> {
    return super.getList(orderField, orderDirection);
  }

  public override async add(item: Omit<QuarantineInvoice, 'id'>): Promise<string> {
    const lotRef = doc(this.firestore, this.lotUnique, item.lot);
    const invoiceDoc = doc(this.getCollection());

    await runTransaction(this.firestore, async (transaction) => {
      const check = await transaction.get(lotRef);
      if (check.exists()) {
        throw new Error(`Лот "${item.lot}" уже существует`);
      }
      transaction.set(lotRef, { id: invoiceDoc.id });
      transaction.set(invoiceDoc, item);
    });

    return invoiceDoc.id;
  }

  protected override getConverter() {
    const converter = super.getConverter()!;
    converter.fromFirestore = (
      snapshot: QueryDocumentSnapshot,
      options?: SnapshotOptions,
    ): QuarantineInvoice => {
      const data = snapshot.data(options) as QuarantineInvoice;
      return {
        ...data,
        id: snapshot.id,
        date: new Date((data.date as any).seconds * 1000),
      };
    };
    return converter;
  }
}

export interface QuarantineInvoiceItem {
  positionId: string;
  quantity: number;
  usedQuantity?: number;
  brokenQuantity?: number;
}

export interface QuarantineInvoice extends Deletable {
  date: Date;
  number: string;
  lot: string;
  supplierId: string;
  items: QuarantineInvoiceItem[];
}
