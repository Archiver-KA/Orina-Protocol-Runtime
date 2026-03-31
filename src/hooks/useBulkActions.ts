import { useCallback } from 'react';
import { useAccount } from 'wagmi';
import { BulkAction, BulkOperationResult } from '@/types/bulk';
import { addFavorite } from '@/utils/favoritesUtils';
import { toast } from 'sonner';

/**
 * Hook for executing bulk actions
 */
export function useBulkActions() {
  const { address } = useAccount();
  
  const executeBulkAction = useCallback(async (
    action: BulkAction,
    selectedIds: Set<string>,
    additionalData?: any
  ): Promise<BulkOperationResult> => {
    const ids = Array.from(selectedIds);
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const markUnsupported = (message: string) => {
      failedCount = ids.length;
      errors.push(message);
      toast.error(message);
    };

    try {
      switch (action) {
        case 'add-to-favorites':
          if (!address) {
            throw new Error('Connect wallet to add favorites');
          }
          ids.forEach(id => {
            try {
              addFavorite(address, id);
              successCount++;
            } catch (error) {
              failedCount++;
              errors.push(`Failed to add ${id} to favorites`);
            }
          });
          toast.success(`Added ${successCount} items to favorites`);
          break;

        case 'set-price-alert':
          markUnsupported('Bulk price alerts are not implemented yet');
          break;

        case 'export':
          // Export selected items
          const exportData = {
            items: ids,
            exportDate: Date.now(),
            count: ids.length,
          };
          
          const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
            type: 'application/json' 
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bulk-export-${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          successCount = ids.length;
          toast.success(`Exported ${successCount} items`);
          break;

        case 'delete':
          markUnsupported('Bulk delete is not implemented yet');
          break;

        case 'mark-as-read':
          markUnsupported('Bulk mark-as-read is not implemented yet');
          break;

        case 'archive':
          markUnsupported('Bulk archive is not implemented yet');
          break;

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      toast.error(`Bulk action failed: ${error}`);
      failedCount = ids.length;
    }

    return {
      action,
      successCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  }, [address]);

  return {
    executeBulkAction,
  };
}
