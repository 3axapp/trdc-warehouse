import {Injectable} from '@angular/core';
import {AbstractCollection, Deletable} from './abstract.collection';
import {doc, runTransaction} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class PositionsCollection extends AbstractCollection<Position> {
  protected override collectionName = 'positions';

  private codeUnique = 'positionCodes';

  public override async add(item: Omit<Position, 'id'>): Promise<string> {
    const uniqueRef = doc(this.firestore, this.codeUnique, item.code);
    const position = doc(this.getCollection());

    await runTransaction(this.firestore, async (transaction) => {
      const checkUnique = await transaction.get(uniqueRef);
      if (checkUnique.exists()) {
        throw new Error('Код позиции не уникален');
      }

      transaction.set(uniqueRef, {id: position.id});
      transaction.set(position, item);
    });

    return position.id;
  }

  public override async update(id: string, item: Partial<Position>): Promise<void> {
    const position = doc(this.getCollection(), id);

    await runTransaction(this.firestore, async (transaction) => {
      if (item.code) {
        const current = (await transaction.get(position)).data()! as Position;
        if (item.code != current.code) {
          const newUniqueRef = doc(this.firestore, this.codeUnique, item.code);
          const currentUniqueRef = doc(this.firestore, this.codeUnique, current.code);
          const checkNewUnique = await transaction.get(newUniqueRef);
          if (checkNewUnique.exists() && checkNewUnique.data()['id'] != id) {
            throw new Error('Код позиции не уникален');
          }
          transaction.set(newUniqueRef, {id: position.id});
          transaction.delete(currentUniqueRef);
        }
      }

      transaction.update(position, item);
    });
  }
}

export enum PositionType {
  Normal = 1, // обычный
  Checked = 2, // проверяемый
  Produced = 3, // производимый
}

export interface Position extends Deletable {
  code: string;
  name: string;
  type: PositionType;
}

interface PositionUniqueCode {
  id: string;
}
