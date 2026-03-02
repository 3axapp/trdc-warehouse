import {inject, Injectable} from '@angular/core';
import {Auth} from '@angular/fire/auth';
import {collection, doc, DocumentReference, Firestore, runTransaction} from '@angular/fire/firestore';
import {Position} from './collections/positions.collection';
import {QuarantineInvoice, QuarantineInvoiceCollection, QuarantineInvoiceItem} from './collections/quarantine-invoice.collection';
import {QualityControlStatus} from './collections/supplies.collection';

@Injectable({
  providedIn: 'root',
})
export class QuarantineQcService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly invoicesCollection = inject(QuarantineInvoiceCollection);

  async processQc(
    invoice: QuarantineInvoice,
    itemIndex: number,
    position: Position,
    date: Date,
    quantity: number,
    brokenQuantity: number,
  ): Promise<void> {
    const item = invoice.items[itemIndex];
    const available = item.quantity - (item.usedQuantity ?? 0);
    const total = quantity + brokenQuantity;

    if (quantity <= 0 || brokenQuantity < 0 || total > available) {
      throw new Error('Неверное количество');
    }

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    const dateStr = `${dd}${mm}${yy}`;
    const userId = this.auth.currentUser!.uid;

    // Глобальный счётчик N для связки позиция-дата-счёт (без userId)
    const counterKey = `${position.code}-${dateStr}-${invoice.number}`;
    const counterRef = doc(this.firestore, 'quarantineQcCounters', counterKey);

    // Ключ идемпотентности: тот же пользователь обновляет существующую поставку
    const userKey = `${position.code}-${dateStr}-${invoice.number}-${userId}`;
    const userRef = doc(this.firestore, 'quarantineQcUserLots', userKey);

    const suppliesRef = collection(this.firestore, 'supplies');

    await runTransaction(this.firestore, async (transaction) => {
      // Все чтения должны быть до записей
      const counterDoc = await transaction.get(counterRef);
      const userDoc = await transaction.get(userRef);

      let existingSupplyRef: DocumentReference | null = null;
      let currentQty: number | null = null;

      if (userDoc.exists()) {
        const {supplyId} = userDoc.data() as {supplyId: string};
        existingSupplyRef = doc(suppliesRef, supplyId);
        const currentSupply = await transaction.get(existingSupplyRef);
        currentQty = (currentSupply.data()?.['quantity'] ?? 0) as number;
      }

      // Записи
      const updatedItems: QuarantineInvoiceItem[] = invoice.items.map((it, idx) =>
        idx === itemIndex
          ? {...it, usedQuantity: (it.usedQuantity ?? 0) + total, brokenQuantity: (it.brokenQuantity ?? 0) + brokenQuantity}
          : it,
      );
      await this.invoicesCollection.update(invoice.id, {items: updatedItems}, transaction);

      if (existingSupplyRef !== null && currentQty !== null) {
        // Тот же пользователь — обновляем существующую поставку
        transaction.update(existingSupplyRef, {quantity: currentQty + quantity});
      } else {
        // Новый пользователь — создаём поставку с инкрементом N
        const n = (counterDoc.exists() ? (counterDoc.data()['count'] as number) : 0) + 1;
        const lot = `${position.code}-${dateStr}-${invoice.number}-${n}`;

        const supplyRef = doc(suppliesRef);
        transaction.set(supplyRef, {
          positionId: position.id,
          supplierId: invoice.supplierId,
          date,
          quantity,
          usedQuantity: 0,
          qualityControlStatus: QualityControlStatus.Completed,
          qualityControlDate: date,
          qualityControlUserId: userId,
          lot,
        });

        transaction.set(counterRef, {count: n});
        transaction.set(userRef, {supplyId: supplyRef.id, lot});
      }
    });
  }
}
