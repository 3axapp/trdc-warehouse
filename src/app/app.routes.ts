import {Routes} from '@angular/router';
import {Login} from './components/login/login';
import {Supplies} from './components/guard-area/supplies/supplies';
import {AuthGuard, redirectLoggedInTo, redirectUnauthorizedTo} from '@angular/fire/auth-guard';
import {Layout} from './components/guard-area/layout/layout';
import {Positions} from './components/guard-area/positions/positions';
import {Suppliers} from './components/guard-area/suppliers/suppliers';
import {Executors} from './components/guard-area/executors/executors';
import {Manufacturing} from './components/guard-area/manufacturing/manufacturing';
import {chipRecipe, packRecipe, shipRecipe} from './recipes';

const redirectUnauthorizedToLogin = () => redirectUnauthorizedTo(['login']);
const redirectLoggedInToItems = () => redirectLoggedInTo(['']);

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    canActivate: [AuthGuard],
    data: {authGuardPipe: redirectUnauthorizedToLogin},
    children: [
      {path: '', component: Supplies},
      {path: 'shipments', component: Manufacturing, data: {recipe: shipRecipe}},
      {path: 'packing', component: Manufacturing, data: {recipe: packRecipe}},
      {path: 'manufacturing', component: Manufacturing, data: {recipe: chipRecipe}},
      {path: 'positions', component: Positions},
      {path: 'suppliers', component: Suppliers},
      {path: 'executors', component: Executors},
    ],
  },
  {
    path: 'login',
    component: Login,
    canActivate: [AuthGuard],
    data: {authGuardPipe: redirectLoggedInToItems},
  },
  {path: '**', redirectTo: '/login'},
];
