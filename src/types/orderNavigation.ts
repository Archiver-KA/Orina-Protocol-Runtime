export interface OrderNavigationRequest {
  requestKey: string;
  orderId: string;
  source?: 'insights-calendar';
  phase?: string;
  timestamp?: number;
}
