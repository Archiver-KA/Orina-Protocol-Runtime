import { Heart, Bell, Download, Trash2, X, Check } from 'lucide-react';
import { BulkAction } from '@/types/bulk';
import { motion, AnimatePresence } from 'motion/react';

interface BulkToolbarProps {
  selectedCount: number;
  onAction: (action: BulkAction) => void;
  onCancel: () => void;
  actions?: BulkAction[];
}

const actionConfigs = {
  'add-to-favorites': {
    label: 'Add to Favorites',
    icon: Heart,
    color: 'text-pink-400',
  },
  'set-price-alert': {
    label: 'Set Price Alert',
    icon: Bell,
    color: 'text-orange-400',
  },
  'export': {
    label: 'Export',
    icon: Download,
    color: 'text-green-400',
  },
  'delete': {
    label: 'Delete',
    icon: Trash2,
    color: 'text-red-400',
  },
};

export function BulkToolbar({
  selectedCount,
  onAction,
  onCancel,
  actions = ['add-to-favorites', 'export'],
}: BulkToolbarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl px-6 py-4 flex items-center gap-4">
            {/* Selection count */}
            <div className="flex items-center gap-2 pr-4 border-r border-zinc-800">
              <div className="w-5 h-5 bg-[#2CC295] rounded flex items-center justify-center">
                <Check size={14} className="text-black" />
              </div>
              <span className="text-sm font-bold text-white">
                {selectedCount} selected
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {actions.map(action => {
                const config = actionConfigs[action];
                const Icon = config.icon;
                
                return (
                  <button
                    key={action}
                    onClick={() => onAction(action)}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-all font-medium text-sm group"
                  >
                    <Icon size={16} className={`${config.color} group-hover:scale-110 transition-transform`} />
                    <span>{config.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cancel button */}
            <button
              onClick={onCancel}
              className="ml-2 p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
              title="Cancel selection"
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
