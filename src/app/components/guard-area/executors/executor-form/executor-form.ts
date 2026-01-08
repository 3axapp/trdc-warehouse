import {Component, inject, OnInit} from '@angular/core';
import {injectContext} from '@taiga-ui/polymorpheus';
import {TuiButton, TuiDialogContext, TuiTextfield} from '@taiga-ui/core';
import {Supplier} from '../../../../services/collections/suppliers.collection';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {TuiCard} from '@taiga-ui/layout';

@Component({
  selector: 'app-executor-form',
  imports: [
    ReactiveFormsModule,
    TuiCard,
    TuiTextfield,
    TuiButton,
  ],
  templateUrl: './executor-form.html',
  styleUrl: './executor-form.scss',
})
export class ExecutorForm implements OnInit {

  public readonly context = injectContext<TuiDialogContext<Partial<Supplier>, Supplier | undefined>>();

  private fb = inject(FormBuilder);

  public positionForm = this.fb.group({
    name: ['', [Validators.required]],
  });

  public ngOnInit(): void {
    if (!this.context.data) {
      return;
    }
    this.positionForm.setValue({
      name: this.context.data.name,
    });
  }

  protected get data(): Supplier | undefined {
    return this.context.data;
  }

  public submit(): void {
    if (this.positionForm.invalid) {
      return;
    }
    this.context.completeWith({
      name: this.positionForm.value.name!,
    });
  }
}
