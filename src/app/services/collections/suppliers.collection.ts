import {Injectable} from '@angular/core';
import {AbstractCollection, Deletable} from './abstract.collection';

@Injectable({
  providedIn: 'root',
})
export class SuppliersCollection extends AbstractCollection<Supplier> {
  protected override collectionName = 'suppliers';
}

export interface Supplier extends Deletable {
  name: string;
}
