import { environment } from '../environments/environment.development';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectFirestoreEmulator, getFirestore, provideFirestore } from '@angular/fire/firestore';
import { Auth, connectAuthEmulator, getAuth, provideAuth } from '@angular/fire/auth';
import { TestBedStatic } from '@angular/core/testing';
import { AuthService } from '../app/services/auth.service';

export const testUser = {
  id: '',
  email: 'test@unit.email',
  password: 'test@unit.email',
};

export const testUser2 = {
  id: '',
  email: 'test2@unit.email',
  password: 'test2@unit.email',
};

export async function clearFirestoreEmulator(): Promise<void> {
  const projectId = environment.firebaseConfig.projectId;
  try {
    // Разлогиниваем текущего пользователя перед очисткой
    const auth = getAuth();
    if (auth.currentUser) {
      await auth.signOut();
    }

    const [firestoreResponse, authResponse] = await Promise.all([
      fetch(
        `http://localhost:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`,
        { method: 'DELETE' },
      ),
      fetch(`http://localhost:9099/emulator/v1/projects/${projectId}/accounts`, {
        method: 'DELETE',
      }),
    ]);

    if (firestoreResponse.ok && authResponse.ok) {
      console.log('🧹 Firestore emulator data cleared');
    } else {
      console.warn(
        `⚠️ Failed to clear emulator: Firestore ${firestoreResponse.status}, Auth ${authResponse.status}`,
      );
    }
  } catch (error) {
    console.warn('⚠️ Could not clear emulator:', error);
  }
  testUser.id = '';
  testUser2.id = '';
}

export const provideFirebaseAppTest = () =>
  provideFirebaseApp(() => initializeApp(environment.firebaseConfig));
export const provideFirestoreTest = () =>
  provideFirestore(() => {
    const firestoreInstance = getFirestore();
    connectFirestoreEmulator(firestoreInstance, 'localhost', 8080);
    return firestoreInstance;
  });
export const provideAuthTest = () =>
  provideAuth(() => {
    const auth = getAuth();
    connectAuthEmulator(auth, 'http://localhost:9099');
    return auth;
  });
export const signupAndSignin = async (TestBed: TestBedStatic, user = testUser) => {
  const auth = TestBed.inject(Auth);
  if (!auth.currentUser) {
    const authService = TestBed.inject(AuthService);

    try {
      await authService.login(user.email, user.password);
      user.id = auth.currentUser!.uid;
      return;
    } catch (error) {
      console.log('login 1', error);
    }
    try {
      await authService.register(user.email, user.password, 'Test User', 'Тестовая должность');
      await authService.login(user.email, user.password);
      user.id = auth.currentUser!.uid;
    } catch (error) {
      console.error('register', error);
    }
  }
};

export const signOut = async (TestBed: TestBedStatic) => {
  const auth = TestBed.inject(Auth);
  if (auth.currentUser) {
    try {
      const authService = TestBed.inject(AuthService);
      await authService.logout();
    } catch (e) {
      console.log('signOut', e);
    }
  }
  testUser.id = '';
  testUser2.id = '';
};
