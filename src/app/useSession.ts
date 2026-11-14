import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui';
import { signOutOfGoogle } from '@/services/firebase';
import { useAuth } from '@/store/auth';

/** The current user plus a sign-out that works for both guests and Google users. */
export function useSession() {
  const { t } = useTranslation();
  const user = useAuth((state) => state.user);
  const setUser = useAuth((state) => state.setUser);

  const signOut = useCallback(() => {
    const wasGoogle = user?.provider === 'google';
    // Clearing the profile is enough: the route guard shows the sign-in screen.
    setUser(null);
    toast({ title: t('auth.signedOut') });
    if (wasGoogle) void signOutOfGoogle();
  }, [setUser, t, user?.provider]);

  return { user, signOut };
}
