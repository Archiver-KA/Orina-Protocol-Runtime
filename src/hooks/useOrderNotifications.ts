import { useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAccount } from 'wagmi';

/**
 * Hook to automatically create notifications for order events
 * This is a helper to integrate notifications with blockchain events
 */
export function useOrderNotifications() {
  const { addNotification } = useNotifications();
  const { address } = useAccount();

  /**
   * Notify when order is created
   */
  const notifyOrderCreated = (orderId: string, assetId: string, amount: string) => {
    addNotification(
      'order',
      'Order Created Successfully',
      `Order #${orderId.slice(0, 8)} created for asset #${assetId}. Amount: ${amount}`,
      { orderId, assetId, amount }
    );
  };

  /**
   * Notify when order is paid
   */
  const notifyOrderPaid = (orderId: string, amount: string, isBuyer: boolean) => {
    addNotification(
      'success',
      isBuyer ? 'Payment Sent Successfully' : 'Payment Received',
      isBuyer
        ? `Your payment of ${amount} has been escrowed for Order #${orderId.slice(0, 8)}`
        : `Received payment of ${amount} for Order #${orderId.slice(0, 8)}`,
      { orderId, amount }
    );
  };

  /**
   * Notify when order is released
   */
  const notifyOrderReleased = (orderId: string, amount: string, isSeller: boolean) => {
    addNotification(
      'success',
      isSeller ? 'Payment Released' : 'Order Completed',
      isSeller
        ? `Payment of ${amount} released for Order #${orderId.slice(0, 8)}`
        : `Order #${orderId.slice(0, 8)} completed successfully`,
      { orderId, amount }
    );
  };

  /**
   * Notify when order is cancelled
   */
  const notifyOrderCancelled = (orderId: string, reason?: string) => {
    addNotification(
      'warning',
      'Order Cancelled',
      reason
        ? `Order #${orderId.slice(0, 8)} cancelled: ${reason}`
        : `Order #${orderId.slice(0, 8)} has been cancelled`,
      { orderId }
    );
  };

  /**
   * Notify when payment deadline is approaching
   */
  const notifyPaymentDeadline = (orderId: string, hoursLeft: number) => {
    addNotification(
      'warning',
      'Payment Deadline Approaching',
      `Order #${orderId.slice(0, 8)} payment is due in ${hoursLeft} hours`,
      { orderId }
    );
  };

  /**
   * Notify when auto-release is approaching
   */
  const notifyAutoReleaseWarning = (orderId: string, hoursLeft: number) => {
    addNotification(
      'warning',
      'Auto-Release Approaching',
      `Order #${orderId.slice(0, 8)} will auto-release in ${hoursLeft} hours. Please confirm delivery.`,
      { orderId }
    );
  };

  /**
   * Notify transaction errors
   */
  const notifyTransactionError = (action: string, error: string) => {
    addNotification(
      'error',
      `${action} Failed`,
      error || 'Transaction was rejected or failed. Please try again.',
      {}
    );
  };

  /**
   * Notify asset minted
   */
  const notifyAssetMinted = (assetId: string, name: string) => {
    addNotification(
      'success',
      'Asset Minted Successfully',
      `Your RWA asset "${name}" (ID: ${assetId}) has been minted!`,
      { assetId }
    );
  };

  /**
   * Notify network change required
   */
  const notifyNetworkChange = (requiredNetwork: string) => {
    addNotification(
      'system',
      'Network Switch Required',
      `Please switch to ${requiredNetwork} to continue using the marketplace`,
      {}
    );
  };

  return {
    notifyOrderCreated,
    notifyOrderPaid,
    notifyOrderReleased,
    notifyOrderCancelled,
    notifyPaymentDeadline,
    notifyAutoReleaseWarning,
    notifyTransactionError,
    notifyAssetMinted,
    notifyNetworkChange,
  };
}
