import { inject, Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
} from '@angular/fire/auth';
import { UsersCollection } from './collections/users.collection';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  private usersCollection = inject(UsersCollection);

  public getIdentity() {
    return this.auth.currentUser;
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

  public login(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  public logout(): Promise<void> {
    return signOut(this.auth);
  }
}
