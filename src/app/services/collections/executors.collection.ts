import {Injectable} from '@angular/core';
import {AbstractCollection, Deletable} from './abstract.collection';

@Injectable({
  providedIn: 'root',
})
export class ExecutorsCollection extends AbstractCollection<Executor> {
  protected override collectionName = 'executors';
}

export interface Executor extends Deletable {
  name: string;
  post: string;
}
