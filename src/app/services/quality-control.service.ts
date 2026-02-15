import {inject, Injectable} from '@angular/core';
import {Auth} from '@angular/fire/auth';
import {QualityControlStatus, SuppliesCollection, Supply} from './collections/supplies.collection';

@Injectable({
  providedIn: 'root',
})
export class QualityControlService {
  private auth = inject(Auth);
  private supplies = inject(SuppliesCollection);

  public async approve(supply: Supply, data: ApproveData) {
    if (data.brokenQuantity > supply.quantity || !(data.brokenQuantity >= 0)) {
      throw new Error('Неправильно количество брака');
    }

    await this.supplies.update(supply.id, {
      ...data,
      qualityControlStatus: QualityControlStatus.Completed,
      qualityControlUserId: this.auth.currentUser!.uid,
    });
  }
}

export interface ApproveData {
  qualityControlDate: Date;
  brokenQuantity: number;
}
