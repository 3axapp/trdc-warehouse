import {inject, Injectable} from '@angular/core';
import {Auth} from '@angular/fire/auth';
import {QualityControlStatus, SuppliesCollection, Supply} from './collections/supplies.collection';
import {doc, Firestore, runTransaction} from '@angular/fire/firestore';
import {PositionsCollection} from './collections/positions.collection';

@Injectable({
  providedIn: 'root',
})
export class QualityControlService {
  private auth = inject(Auth);
  private supplies = inject(SuppliesCollection);
  private positions = inject(PositionsCollection);
  private firestore = inject(Firestore);

  private positionLotUnique = 'positionLots';

  public async approve(supply: Supply, data: ApproveData) {
    if (data.brokenQuantity > supply.quantity || !(data.brokenQuantity >= 0)) {
      throw new Error('Неправильно количество брака');
    }
    const supplyRef = doc(this.supplies.getCollection(), supply.id);

    await runTransaction(this.firestore, async (transaction) => {
      const position = await this.positions.get(supply.positionId);
      const uniqueRef = doc(this.firestore, this.positionLotUnique, `${position.code}_${data.lot}`);
      const checkUnique = await transaction.get(uniqueRef);
      if (checkUnique.exists()) {
        throw new Error('Лот поставки позиции не уникален');
      }

      transaction.set(uniqueRef, {id: supply.id});
      transaction.update(supplyRef, {
        ...data,
        qualityControlStatus: QualityControlStatus.Completed,
        qualityControlUserId: this.auth.currentUser!.uid,
      });
    });
  }
}

export interface ApproveData {
  qualityControlDate: Date;
  brokenQuantity: number;
  lot: number;
}
