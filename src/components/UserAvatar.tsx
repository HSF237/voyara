import { Avatar, type AvatarSize } from '@/components/ui';
import type { AppUser } from '@/store/auth';

/** The signed-in person's photo, emoji or initials. */
export function UserAvatar({ user, size = 'md' }: { user: AppUser; size?: AvatarSize }) {
  return <Avatar name={user.name} src={user.photoURL} emoji={user.emoji} size={size} />;
}
