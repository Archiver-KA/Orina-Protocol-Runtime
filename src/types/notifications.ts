export type NotificationType = 'order' | 'message' | 'system' | 'success' | 'warning' | 'error' | 'community';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  metadata?: {
    orderId?: string;
    fromAddress?: string;
    assetId?: string;
    amount?: string;
    postId?: string;
    commentId?: string;
    actorName?: string;
    actorAddress?: string;
    [key: string]: any;
  };
}

export interface NotificationPreferences {
  enableDesktop: boolean;
  enableSound: boolean;
  enableToasts: boolean;
  types: {
    order: boolean;
    message: boolean;
    system: boolean;
    community?: boolean;
  };
}