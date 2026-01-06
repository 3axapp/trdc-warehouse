import {
  collection,
  doc,
  Firestore,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Transaction,
  updateDoc,
} from '@angular/fire/firestore';
import {
  DocumentData,
  FirestoreDataConverter,
  OrderByDirection,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from '@firebase/firestore';
import {inject, Injectable} from '@angular/core';

export interface Deletable {
  id: string;
  deleted?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export abstract class AbstractCollection<T extends Deletable = Deletable> {
  protected collectionName = '';

  protected firestore = inject(Firestore);

  async get(id: string): Promise<T> {
    const docRef = doc(this.getCollection(), id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as T;
    }
    throw new Error(`Document ${id} not found`);
  }

  async add(item: Omit<T, 'id'>, transaction?: Transaction): Promise<string> {
    const docRef = doc(this.getCollection());

    if (transaction) {
      await transaction.set(docRef, item);
    } else {
      await setDoc(docRef, item);
    }

    return docRef.id;
  }

  async update(id: string, item: WithFieldValue<Partial<T>>, transaction?: Transaction): Promise<void> {
    const docRef = doc(this.getCollection(), id);
    if (transaction) {
      await transaction.update(docRef, item as DocumentData);
    } else {
      await updateDoc(docRef, item as DocumentData);
    }
  }

  async archive(id: string): Promise<void> {
    await this.update(id, {deleted: true} as Partial<T>);
  }

  async unarchive(id: string): Promise<void> {
    await this.update(id, {deleted: false} as Partial<T>);
  }

  async delete(id: string): Promise<void> {
    alert('не используем');
    // return;
    // const docRef = doc(this.firestore, this.positionsCollection, id);
    // await deleteDoc(docRef);
  }

  async getList(orderField = 'name', orderDirection: OrderByDirection = 'asc'): Promise<T[]> {
    const q = query(
      this.getCollection(),
      orderBy(orderField, orderDirection),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as T);
  }

  public getCollection() {
    return collection(this.firestore, this.collectionName).withConverter(this.getConverter());
  }

  protected getConverter(): FirestoreDataConverter<T, DocumentData> {
    return {
      toFirestore(modelObject: WithFieldValue<T>): WithFieldValue<DocumentData> {
        const dbModel = modelObject as Partial<T>;
        delete dbModel.id;
        return dbModel;
      },
      fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData, DocumentData>, options?: SnapshotOptions): T {
        const data = snapshot.data(options) as T;
        data.id = snapshot.id;
        return data;
      },
    };
  }
}
