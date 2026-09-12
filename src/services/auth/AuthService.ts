export interface AuthUser {
  id: string;
  displayName: string | null;
  email: string | null;
  isAnonymous: boolean;
}

/**
 * Auth is not implemented yet. The provider (Supabase / Firebase Auth /
 * Auth0) is a backend decision, not a mobile one — this interface is the
 * contract the rest of the app codes against so that choice doesn't ripple
 * through every screen.
 */
export interface AuthService {
  getCurrentUser(): Promise<AuthUser | null>;
  signInAnonymously(): Promise<AuthUser>;
  signOut(): Promise<void>;
}

/**
 * Local, device-only stand-in: every install is one anonymous user, no
 * network call, no persistence beyond this process. Enough for Phase 1
 * screens (Profile, entitlements) to have a user to render. Replace with a
 * real `AuthService` once the backend defines its auth flow.
 */
export class AnonymousAuthService implements AuthService {
  private user: AuthUser | null = null;

  async getCurrentUser(): Promise<AuthUser | null> {
    return this.user;
  }

  async signInAnonymously(): Promise<AuthUser> {
    this.user = {
      id: 'local-anonymous-user',
      displayName: null,
      email: null,
      isAnonymous: true,
    };
    return this.user;
  }

  async signOut(): Promise<void> {
    this.user = null;
  }
}
