import { inject, Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
} from '@angular/fire/auth';
import { User, UsersCollection } from './collections/users.collection';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private usersCollection = inject(UsersCollection);
  private user: User | null = null;

  public getIdentity(): User | null {
    return this.user;
  }

  public async loadUser(): Promise<void> {
    const firebaseUser = this.auth.currentUser;
    if (firebaseUser && !this.user) {
      this.user = await this.usersCollection.get(firebaseUser.uid);
    }
  }

  public async register(
    email: string,
    password: string,
    fullName: string,
    position: string,
  ): Promise<UserCredential> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    await this.usersCollection.addWithUid(credential.user.uid, {
      email,
      fullName,
      position,
    });
    return credential;
  }

  public async login(email: string, password: string): Promise<void> {
    const result = await signInWithEmailAndPassword(this.auth, email, password);
    this.user = await this.usersCollection.get(result.user.uid);
  }

  public async logout(): Promise<void> {
    await signOut(this.auth);
    this.user = null;
  }
}
