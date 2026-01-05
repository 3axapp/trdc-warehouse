import {TestBed} from '@angular/core/testing';

import {PositionsService, PositionType} from './positions.service';
import {provideZonelessChangeDetection} from '@angular/core';
import {FirebaseApp, initializeApp} from '@angular/fire/app';
import {connectFirestoreEmulator, doc, Firestore, getDoc, getFirestore} from '@angular/fire/firestore';
import {environment} from '../../environments/environment.development';

describe('PositionsService', () => {
  let service: PositionsService;
  let app: FirebaseApp;
  let firestoreInstance: any;

  beforeAll(async () => {
    await clearFirestoreEmulator();
    // Инициализация Firebase с тестовым конфигом
    app = initializeApp(environment.firebaseConfig);

    firestoreInstance = getFirestore(app);
    connectFirestoreEmulator(firestoreInstance, 'localhost', 8080);
  });

  async function clearFirestoreEmulator(): Promise<void> {
    try {
      const response = await fetch(
        `http://localhost:8080/emulator/v1/projects/${environment.firebaseConfig.projectId}/databases/(default)/documents`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.ok) {
        console.log('🧹 Firestore emulator data cleared');
      } else {
        console.warn(`⚠️ Failed to clear emulator: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Could not clear emulator:', error);
    }
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {provide: Firestore, useValue: firestoreInstance},
      ],
    });
    service = TestBed.inject(PositionsService);
  });

  it('Создание сервиса', () => {
    expect(service).toBeTruthy();
  });

  it('404', async () => {
    await expectAsync(service.get('444'))
      .toBeRejectedWithError('Document 444 not found');
  });

  it('Создание позиции', async () => {
    const id = await service.add({
      code: 'create_code',
      name: 'create_name',
      type: PositionType.Normal,
    });
    const position = await service.get(id);
    expect(position).toEqual({
      id,
      code: 'create_code',
      name: 'create_name',
      type: PositionType.Normal,
    });
  });

  it('Обновление позиции', async () => {
    const id = await service.add({
      code: 'update_code',
      name: 'update_name',
      type: PositionType.Normal,
    });
    await service.update(id, {name: 'new name'});
    const position = await service.get(id);
    expect(position).toEqual({
      id,
      code: 'update_code',
      name: 'new name',
      type: PositionType.Normal,
    });
  });

  it('Архивация позиции', async () => {
    const id = await service.add({
      code: 'archive_code',
      name: 'archive_name',
      type: PositionType.Normal,
    });
    await service.archive(id);
    const position = await service.get(id);
    console.log(position)
    expect(position).toEqual({
      id,
      code: 'archive_code',
      name: 'archive_name',
      type: PositionType.Normal,
      deleted: true,
    });
  });

  it('Добавление уникальный код', async () => {
    const data = {
      code: 'unique_code',
      name: 'unique_name',
      type: PositionType.Normal,
    };
    await service.add(data);
    await expectAsync(service.add(data)).toBeRejectedWithError();
  });

  it('Обновление уникальный код', async () => {
    const data1 = {
      code: 'unique_code1',
      name: 'unique_name1',
      type: PositionType.Normal,
    };
    const data2 = {
      code: 'unique_code2',
      name: 'unique_name2',
      type: PositionType.Normal,
    };
    const id1 = await service.add(data1);
    const id2 = await service.add(data2);
    await expectAsync(service.add(data1)).toBeRejectedWithError();
    await expectAsync(service.update(id2, data1)).toBeRejectedWithError();
    await service.update(id2, {name: 'name'});
    await expectAsync(service.get(id2)).toBeResolvedTo({
      id: id2,
      code: 'unique_code2',
      name: 'name',
      type: PositionType.Normal,
    });
    await service.update(id2, {code: 'code2'});
    await expectAsync(service.get(id2)).toBeResolvedTo({
      id: id2,
      code: 'code2',
      name: 'name',
      type: PositionType.Normal,
    });

    const oldUniqueRef = doc(firestoreInstance, 'positionCodes', 'unique_code2');
    const oldUnique = await getDoc(oldUniqueRef);
    expect(oldUnique.exists()).toBeFalse();
  });
});
