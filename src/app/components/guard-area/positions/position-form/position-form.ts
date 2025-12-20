import {Component, inject, OnInit, signal} from '@angular/core';
import {TuiButton, TuiDialogContext, tuiItemsHandlersProvider, TuiTextfield} from '@taiga-ui/core';
import {injectContext} from '@taiga-ui/polymorpheus';
import {Position, PositionType} from '../../../../services/positions.service';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {TuiCardLarge} from '@taiga-ui/layout';
import {TuiChevron, TuiDataListWrapper, TuiSelect} from '@taiga-ui/kit';
import {PositionTypePipe} from '../../../../pipes/position-type-pipe';

const positionNames = new PositionTypePipe();

@Component({
  selector: 'app-position-form',
  imports: [
    ReactiveFormsModule,
    TuiCardLarge,
    TuiTextfield,
    TuiButton,
    TuiSelect,
    TuiDataListWrapper,
    TuiChevron,
  ],
  providers: [
    tuiItemsHandlersProvider({
      stringify: signal(positionNames.transform.bind(positionNames)),
      // identityMatcher: signal((a: PositionType, b: PositionType) => a.id === b.id),
      // disabledItemHandler: signal((x: PositionType) => x.name.includes('Trevor')),
    }),
  ],
  templateUrl: './position-form.html',
  styleUrl: './position-form.scss',
})
export class PositionForm implements OnInit {

  public readonly context = injectContext<TuiDialogContext<Partial<Position>, Position | undefined>>();

  private fb = inject(FormBuilder);

  protected positionForm = this.fb.group({
    name: ['', [Validators.required]],
    type: [PositionType.Normal, [Validators.required]],
  });

  protected types = [
    PositionType.Normal,
    PositionType.Checked,
    PositionType.Produced,
  ];

  public ngOnInit(): void {
    if (!this.context.data) {
      return;
    }
    this.positionForm.setValue({
      name: this.context.data.name,
      type: this.context.data.type,
    });
  }

  protected get data(): Position | undefined {
    return this.context.data;
  }

  protected submit(): void {
    if (this.positionForm.invalid) {
      return;
    }
    this.context.completeWith({
      name: this.positionForm.value.name!,
      type: this.positionForm.value.type!,
    });
  }
}
