export interface Notification {
  id: string;
  type: 'demand_submitted' | 'supply_submitted' | 'demand_approved' | 'demand_rejected' | 'supply_approved' | 'supply_rejected';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  forRoles: string[];
}

const NOTIFICATIONS_KEY = 'ercm_notifications';

export function getNotifications(): Notification[] {
  const stored = localStorage.getItem(NOTIFICATIONS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveNotifications(notifications: Notification[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export function addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
  const notifications = getNotifications();
  notifications.unshift({
    ...notification,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    read: false,
  });
  if (notifications.length > 50) notifications.length = 50;
  saveNotifications(notifications);
}

export function markAsRead(id: string) {
  const notifications = getNotifications();
  const n = notifications.find(n => n.id === id);
  if (n) n.read = true;
  saveNotifications(notifications);
}

export function markAllAsRead() {
  const notifications = getNotifications();
  notifications.forEach(n => n.read = true);
  saveNotifications(notifications);
}

export function getUnreadCount(userRole: string): number {
  return getNotifications().filter(n => !n.read && n.forRoles.includes(userRole)).length;
}

export function getNotificationsForRole(userRole: string): Notification[] {
  return getNotifications().filter(n => n.forRoles.includes(userRole));
}
