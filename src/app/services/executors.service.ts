import {Injectable} from '@angular/core';
import {AbstractCollection, Deletable} from './abstract-collection';

@Injectable({
  providedIn: 'root',
})
export class ExecutorsService extends AbstractCollection<Executor> {
  protected override collectionName = 'executors';
}

export interface Executor extends Deletable {
  name: string;
}
