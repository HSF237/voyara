import { env } from '@/lib/env';
import type { AppUser } from '@/store/auth';

/**
 * Firebase is loaded on demand: the SDK is only downloaded when someone taps
 * "Continue with Google" or returns with a Google session to re-check.
 */
async function loadAuth() {
  const [{ getApps, initializeApp }, authModule] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const { raw } = env;
  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: raw.VITE_FIREBASE_API_KEY,
      authDomain: raw.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: raw.VITE_FIREBASE_PROJECT_ID,
      storageBucket: raw.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: raw.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: raw.VITE_FIREBASE_APP_ID,
    });
  return { auth: authModule.getAuth(app), authModule };
}

export type AuthProblem =
  | 'notConfigured'
  | 'popupClosed'
  | 'popupBlocked'
  | 'notEnabled'
  | 'domain'
  | 'network'
  | 'unknown';

/** Turn a Firebase error code into one of the messages the UI can explain. */
export function authProblem(error: unknown): AuthProblem {
  const code = (error as { code?: string } | null)?.code ?? '';
  if (code === 'app/not-configured') return 'notConfigured';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'popupClosed';
  }
  if (code === 'auth/popup-blocked') return 'popupBlocked';
  if (
    code === 'auth/operation-not-allowed' ||
    code === 'auth/configuration-not-found' ||
    code === 'auth/admin-restricted-operation'
  ) {
    return 'notEnabled';
  }
  if (code === 'auth/unauthorized-domain') return 'domain';
  if (code === 'auth/network-request-failed') return 'network';
  return 'unknown';
}

export async function signInWithGoogle(): Promise<AppUser> {
  if (!env.features.firebase)
    throw Object.assign(new Error('Firebase not configured'), { code: 'app/not-configured' });
  const { auth, authModule } = await loadAuth();
  const provider = new authModule.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const { user } = await authModule.signInWithPopup(auth, provider);
  return {
    uid: user.uid,
    name: user.displayName ?? user.email?.split('@')[0] ?? 'Traveller',
    provider: 'google',
    email: user.email ?? undefined,
    photoURL: user.photoURL ?? undefined,
  };
}

export async function signOutOfGoogle(): Promise<void> {
  if (!env.features.firebase) return;
  try {
    const { auth, authModule } = await loadAuth();
    await authModule.signOut(auth);
  } catch (error) {
    console.warn('Could not reach Firebase to sign out; cleared the local session anyway.', error);
  }
}

/**
 * For a remembered Google user: confirm Firebase still has the session.
 * Calls `onExpired` if it was revoked or signed out elsewhere.
 */
export async function verifyGoogleSession(uid: string, onExpired: () => void): Promise<void> {
  if (!env.features.firebase) return;
  try {
    const { auth, authModule } = await loadAuth();
    const unsubscribe = authModule.onAuthStateChanged(auth, (current) => {
      unsubscribe();
      if (!current || current.uid !== uid) onExpired();
    });
  } catch {
    /* offline: keep the remembered profile */
  }
}
