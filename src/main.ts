import {bootstrapApplication} from '@angular/platform-browser';
import {appConfig} from './app/app.config';
import {App} from './app/app';
import {registerLocaleData} from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import localeRuExtra from '@angular/common/locales/extra/ru';

registerLocaleData(localeRu, 'ru', localeRuExtra);
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
