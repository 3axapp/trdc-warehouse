import {Component, inject, OnInit} from '@angular/core';
import {injectContext} from '@taiga-ui/polymorpheus';
import {TuiButton, TuiDialogContext, TuiTextfield} from '@taiga-ui/core';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {TuiCard} from '@taiga-ui/layout';
import {Supplier} from '../../../../services/collections/suppliers.collection';

@Component({
  selector: 'app-supplier-form',
  imports: [
    ReactiveFormsModule,
    TuiCard,
    TuiTextfield,
    TuiButton,
  ],
  templateUrl: './supplier-form.html',
  styleUrl: './supplier-form.scss',
})
export class SupplierForm implements OnInit {

  public readonly context = injectContext<TuiDialogContext<Partial<Supplier>, Supplier | undefined>>();

  private fb = inject(FormBuilder);

  protected positionForm = this.fb.group({
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

  protected submit(): void {
    if (this.positionForm.invalid) {
      return;
    }
    this.context.completeWith({
      name: this.positionForm.value.name!,
    });
  }
}
