import {TestBed} from '@angular/core/testing';

import {AbstractCollection} from './abstract-collection';
import {provideZonelessChangeDetection} from '@angular/core';
import {FirebaseApp, initializeApp} from '@angular/fire/app';
import {
  connectFirestoreEmulator,
  Firestore,
  getFirestore,
} from '@angular/fire/firestore';

describe('AbstractCollection', () => {
  let service: AbstractCollection;
  let app: FirebaseApp;
  let firestoreInstance: any;

  beforeAll(() => {
    // Инициализация Firebase с тестовым конфигом
    app = initializeApp({
      projectId: 'test-project-id',
      apiKey: 'test-key',
    });

    firestoreInstance = getFirestore(app);
    connectFirestoreEmulator(firestoreInstance, 'localhost', 8080);
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {provide: Firestore, useValue: firestoreInstance},
      ],
    });
    service = TestBed.inject(AbstractCollection);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
