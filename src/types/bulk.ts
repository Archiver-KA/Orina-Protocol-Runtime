/**
 * Bulk operations types
 */

export type BulkAction = 
  | 'add-to-favorites'
  | 'set-price-alert'
  | 'export'
  | 'delete'
  | 'mark-as-read'
  | 'archive';

export interface BulkSelectionState {
  selectedIds: Set<string>;
  selectMode: boolean;
  totalItems: number;
}

export interface BulkActionConfig {
  id: BulkAction;
  label: string;
  icon: React.ReactNode;
  color: string;
  confirmRequired: boolean;
  confirmMessage?: string;
}

export interface BulkOperationResult {
  action: BulkAction;
  successCount: number;
  failedCount: number;
  errors?: string[];
}
