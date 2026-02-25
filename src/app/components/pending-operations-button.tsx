import { useState, useEffect } from 'react';
import { Bot, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { PendingOperation } from '@/app/types/api-key';
import { APIKeyManager } from '@/utils/apiKeyManager';
import { motion, AnimatePresence } from 'motion/react';

interface PendingOperationsButtonProps {
  walletAddress: string;
}

export function PendingOperationsButton({ walletAddress }: PendingOperationsButtonProps) {
  const [operations, setOperations] = useState<PendingOperation[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadOperations();
    // Poll for updates every 10 seconds
    const interval = setInterval(loadOperations, 10000);
    return () => clearInterval(interval);
  }, [walletAddress]);

  const loadOperations = () => {
    const ops = APIKeyManager.getPendingOperations(walletAddress);
    setOperations(ops);
  };

  const handleApprove = (operationId: string) => {
    APIKeyManager.updateOperationStatus(operationId, 'approved');
    // In real implementation, this would trigger the actual blockchain transaction
    setTimeout(() => {
      APIKeyManager.updateOperationStatus(operationId, 'completed', '0x' + Math.random().toString(36).substr(2, 64));
      loadOperations();
    }, 2000);
    loadOperations();
  };

  const handleReject = (operationId: string) => {
    APIKeyManager.rejectPendingOperation(operationId);
    loadOperations();
  };

  const handleApproveAll = () => {
    operations.forEach(op => handleApprove(op.id));
  };

  const getOperationIcon = (type: PendingOperation['type']) => {
    return '🤖';
  };

  const getOperationTitle = (op: PendingOperation) => {
    const titles = {
      create: 'Create New Listing',
      update: 'Update Asset Details',
      delete: 'Remove Asset',
      mint: 'Mint New NFT',
      price_change: 'Update Price'
    };
    return titles[op.type];
  };

  const getOperationDescription = (op: PendingOperation) => {
    if (op.type === 'price_change') {
      return `Change price to ${op.payload.newPrice}`;
    }
    if (op.type === 'create') {
      return `List "${op.payload.name}" for ${op.payload.price}`;
    }
    if (op.type === 'update') {
      return `Update "${op.payload.name}"`;
    }
    if (op.type === 'mint') {
      return `Mint "${op.payload.name}"`;
    }
    if (op.type === 'delete') {
      return `Remove from marketplace`;
    }
    return 'AI Agent action';
  };

  if (operations.length === 0) {
    return null;
  }

  return (
    <>
      {/* Notification Button */}
      <button
        onClick={() => setShowModal(true)}
        className="relative p-2 hover:bg-zinc-800 rounded-lg transition-colors group"
      >
        <Bot size={20} className="text-zinc-400 group-hover:text-[#2CC295]" />
        {operations.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#2CC295] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
            {operations.length}
          </span>
        )}
      </button>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141417] border border-[#27272a] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#27272a]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Bot className="text-[#2CC295]" size={24} />
                      Pending AI Actions
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      {operations.length} action{operations.length > 1 ? 's' : ''} waiting for approval
                    </p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* Operations List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {operations.map((operation) => (
                  <div
                    key={operation.id}
                    className="bg-zinc-900/50 border border-[#27272a] rounded-xl p-4 hover:border-[#2CC295]/30 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-full bg-[#2CC295]/10 border border-[#2CC295]/20 flex items-center justify-center text-lg shrink-0">
                        {getOperationIcon(operation.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <h4 className="text-white font-bold text-sm">{getOperationTitle(operation)}</h4>
                          <span className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded uppercase font-bold shrink-0">
                            Pending
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mb-3">{getOperationDescription(operation)}</p>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-[10px] text-zinc-500 mb-3">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(operation.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Bot size={10} />
                            AI Agent
                          </span>
                          {operation.requiresSignature && (
                            <span className="flex items-center gap-1 text-yellow-400">
                              <AlertTriangle size={10} />
                              Requires Signature
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(operation.id)}
                            className="flex-1 px-4 py-2 bg-[#2CC295] text-black rounded-lg text-xs font-bold hover:bg-[#2CC295]/90 transition-colors flex items-center justify-center gap-2"
                          >
                            <Check size={14} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(operation.id)}
                            className="flex-1 px-4 py-2 bg-zinc-800 border border-[#27272a] text-white rounded-lg text-xs font-bold hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                          >
                            <X size={14} />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              {operations.length > 1 && (
                <div className="p-6 border-t border-[#27272a] flex items-center justify-between">
                  <p className="text-xs text-zinc-500">
                    Approve all actions with a single signature
                  </p>
                  <button
                    onClick={handleApproveAll}
                    className="px-6 py-2.5 bg-[#2CC295] text-black rounded-lg text-sm font-bold hover:bg-[#2CC295]/90 transition-colors"
                  >
                    Approve All ({operations.length})
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
