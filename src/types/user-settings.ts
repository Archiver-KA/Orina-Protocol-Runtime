export interface UserAppSettings {
  newOrders: boolean;
  payments: boolean;
  transfers: boolean;
  messagingAlerts: boolean;
  twoFactor: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  saleNotifications: boolean;
  offerNotifications: boolean;
  followerNotifications: boolean;
  publicProfile: boolean;
  showActivity: boolean;
  showBalance: boolean;
  showFollowers: boolean;
  darkMode: boolean;
  compactView: boolean;
  animations: boolean;
  language: string;
  timezone: string;
  currency: string;
  sessionLockout: boolean;
  ipWhitelist: boolean;
  desktopNotificationsEnabled: boolean;
  soundNotificationsEnabled: boolean;
  toastNotificationsEnabled: boolean;
  notificationTypeOrder: boolean;
  notificationTypeMessage: boolean;
  notificationTypeSystem: boolean;
  notificationTypeCommunity: boolean;
}

export interface StoredUserAppSettingsRecord extends UserAppSettings {
  profileEmail?: string;
  updatedAt: number;
}
