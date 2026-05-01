import { Component, inject, OnInit, signal } from '@angular/core';

import {
  TuiTableDirective,
  TuiTableTbody,
  TuiTableTh,
  TuiTableThGroup,
  TuiTableTr,
} from '@taiga-ui/addon-table';
import { User, UsersCollection } from '../../../services/collections/users.collection';

@Component({
  selector: 'app-executors',
  imports: [TuiTableDirective, TuiTableTbody, TuiTableTh, TuiTableThGroup, TuiTableTr],
  templateUrl: './executors.html',
  styleUrl: './executors.scss',
})
export class Executors implements OnInit {
  private executors = inject(UsersCollection);

  protected columns = ['fullName', 'number', 'position', 'role'];

  protected data = signal<User[]>([]);

  public ngOnInit(): void {
    this.load();
  }

  private async load(): Promise<void> {
    return this.executors.getList().then((executors) => {
      this.data.set(executors);
    });
  }
}
