import {environment} from '../environments/environment.development';
import {initializeApp, provideFirebaseApp} from '@angular/fire/app';
import {connectFirestoreEmulator, getFirestore, provideFirestore} from '@angular/fire/firestore';
import {connectAuthEmulator, getAuth, provideAuth} from '@angular/fire/auth';

export async function clearFirestoreEmulator(): Promise<void> {
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

export const provideFirebaseAppTest = () => provideFirebaseApp(() => initializeApp(environment.firebaseConfig));
export const provideFirestoreTest = () => provideFirestore(() => {
  const firestoreInstance = getFirestore();
  connectFirestoreEmulator(firestoreInstance, 'localhost', 8080);
  return firestoreInstance;
});
export const provideAuthTest = () => provideAuth(() => {
  const auth = getAuth();
  connectAuthEmulator(auth, 'http://localhost:9099');
  return auth;
});
