import { NotificationItem as ShellNotificationItem } from '@jozeuzz/alltura-ui';
import type { NotificationItemProps as ShellNotificationItemProps } from '@jozeuzz/alltura-ui';
import type { ShellNotification, ShellNotificationPresentation } from '@jozeuzz/alltura-ui';
import { getNotificationItemPresentation } from '../config/notificationItemCompat';

export type NotificationItemProps = Omit<ShellNotificationItemProps, 'resolvePresentation'>;

function resolvePresentation(
  n: Pick<ShellNotification, 'type' | 'link'>
): ShellNotificationPresentation {
  return getNotificationItemPresentation({ type: n.type, link: n.link ?? null });
}

export default function NotificationItem(props: NotificationItemProps) {
  return <ShellNotificationItem {...props} resolvePresentation={resolvePresentation} />;
}
