import { Injectable } from '@angular/core';
import { AbstractCollection, Deletable } from './abstract.collection';
import { doc, QueryConstraint, runTransaction } from '@angular/fire/firestore';
import { OrderByDirection } from '@firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class UsersCollection extends AbstractCollection<User> {
  protected override collectionName = 'users';

  private numberUnique = 'userNumbers';

  public override async getList(
    orderField = 'fullName',
    orderDirection: OrderByDirection = 'asc',
    ...queryConstraints: QueryConstraint[]
  ): Promise<User[]> {
    return super.getList(orderField, orderDirection, ...queryConstraints);
  }

  public async addWithUid(uid: string, item: Omit<User, 'id' | 'number'>): Promise<string> {
    const userRef = doc(this.getCollection(), uid);

    await runTransaction(this.firestore, async (transaction) => {
      const users = await this.getList('number', 'desc');
      const nextNumber = users.length > 0 ? users[0].number + 1 : 1;
      const uniqueRef = doc(this.firestore, this.numberUnique, String(nextNumber));

      const checkUnique = await transaction.get(uniqueRef);
      if (checkUnique.exists()) {
        throw new Error('Номер пользователя не уникален');
      }

      transaction.set(uniqueRef, { id: uid });
      transaction.set(userRef, { ...item, number: nextNumber } as User);
    });

    return uid;
  }
}

export interface User extends Deletable {
  email: string;
  fullName: string;
  position: string;
  number: number;
}
