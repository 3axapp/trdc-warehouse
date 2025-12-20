import {addDoc, collection, doc, Firestore, getDocs, orderBy, query, updateDoc} from '@angular/fire/firestore';
import {DocumentData} from '@firebase/firestore';
import {Injectable} from '@angular/core';

export interface Deletable {
  id: string;
  deleted?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export abstract class AbstractCollection<T extends Deletable = Deletable> {
  protected collectionName = '';

  constructor(private firestore: Firestore) {
  }

  async add(item: Omit<T, 'id'>): Promise<string> {
    const docRef = await addDoc(
      collection(this.firestore, this.collectionName),
      item,
    );
    return docRef.id;
  }

  async update(id: string, item: Partial<T>): Promise<void> {
    const docRef = doc(this.firestore, this.collectionName, id);
    await updateDoc(docRef, item as DocumentData);
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

  async getList(orderField = 'name'): Promise<T[]> {
    const q = query(
      collection(this.firestore, this.collectionName),
      orderBy(orderField),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as T));
  }
}
