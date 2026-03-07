import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Send, ShieldAlert, Store, User } from 'lucide-react';
import { formatEther } from 'viem';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { formatAddress } from '@/utils/format';
import { AssetThumb } from '@/app/components/asset-thumb';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

interface DisputeResolutionModalProps {
  order: {
    orderId: bigint;
    assetName: string;
    assetImage: string;
    grossPrice: bigint;
    amount: bigint;
    buyer: `0x${string}`;
    seller: `0x${string}`;
    disputeOpenedAt: bigint;
    disputeDeadline: bigint;
    disputeReason: string[];
    disputeComment: string;
    disputeEvidence: string[];
  };
  currentUser: `0x${string}`;
  userRole: 'buyer' | 'seller' | 'arbiter';
  onClose: () => void;
}

type SettlementOutcome = 'buyer_win' | 'seller_win' | 'split';
type ParticipantRole = 'buyer' | 'seller' | 'arbiter';

interface ProposalState {
  outcome: SettlementOutcome;
  splitRatio?: number;
  status: 'pending' | 'rejected' | 'finalized';
  signatures: { buyer: boolean; seller: boolean; arbiter: boolean };
}

interface ChatMessage {
  id: string;
  sender: ParticipantRole;
  senderAddress: `0x${string}`;
  content: string;
  timestamp: number;
  type: 'message' | 'proposal' | 'system';
  proposal?: ProposalState;
}

const ARBITER_ADDRESS = '0x0000000000000000000000000000000000000001' as `0x${string}`;
const BASE_CARD = 'bg-[rgba(24,24,27,0.4)] rounded-[24px]';

const mockMessages: ChatMessage[] = [
  {
    id: 'seed-system',
    sender: 'arbiter',
    senderAddress: ARBITER_ADDRESS,
    content: 'Dispute opened. Please provide evidence and settlement proposal.',
    timestamp: Date.now() - 60 * 60 * 1000,
    type: 'system',
  },
];

function roleBadgeClasses(role: ParticipantRole) {
  if (role === 'buyer') return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  if (role === 'seller') return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
  return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
}

function roleIcon(role: ParticipantRole) {
  if (role === 'buyer') return <User size={12} />;
  if (role === 'seller') return <Store size={12} />;
  return <ShieldAlert size={12} />;
}

export function DisputeResolutionModal({ order, currentUser, userRole, onClose }: DisputeResolutionModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalType, setProposalType] = useState<SettlementOutcome>('split');
  const [splitRatio, setSplitRatio] = useState(50);
  const [showExtendRequest, setShowExtendRequest] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const updateRemaining = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = Number(order.disputeDeadline) - now;
      if (diff <= 0) {
        setTimeRemaining('Expired - Auto Split 50/50');
        return;
      }
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      setTimeRemaining(`${d}d ${h}h ${m}m`);
    };
    updateRemaining();
    const id = setInterval(updateRemaining, 60_000);
    return () => clearInterval(id);
  }, [order.disputeDeadline]);

  const proposalPreview = useMemo(() => {
    if (proposalType === 'buyer_win') return 'Full refund to buyer';
    if (proposalType === 'seller_win') return 'Full release to seller';
    return `Split ${100 - splitRatio}/${splitRatio} (Seller/Buyer)`;
  }, [proposalType, splitRatio]);

  const sendMessage = () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-msg`,
        sender: userRole,
        senderAddress: currentUser,
        content: trimmed,
        timestamp: Date.now(),
        type: 'message',
      },
    ]);
    setNewMessage('');
  };

  const submitProposal = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-proposal`,
        sender: userRole,
        senderAddress: currentUser,
        content: `Settlement proposal: ${proposalPreview}`,
        timestamp: Date.now(),
        type: 'proposal',
        proposal: {
          outcome: proposalType,
          splitRatio: proposalType === 'split' ? splitRatio : undefined,
          status: 'pending',
          signatures: { buyer: false, seller: false, arbiter: false },
        },
      },
    ]);
    setShowProposalForm(false);
  };

  const signProposal = (messageId: string) => {
    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== messageId || !message.proposal || message.proposal.status !== 'pending') {
          return message;
        }
        const signatures = {
          ...message.proposal.signatures,
          [userRole]: true,
        } as ProposalState['signatures'];
        const signedCount = Object.values(signatures).filter(Boolean).length;
        return {
          ...message,
          proposal: {
            ...message.proposal,
            signatures,
            status: signedCount >= 2 ? 'finalized' : 'pending',
          },
        };
      }),
    );
  };

  const rejectProposal = (messageId: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId && message.proposal
          ? {
              ...message,
              proposal: { ...message.proposal, status: 'rejected' },
            }
          : message,
      ),
    );
  };

  const requestExtension = () => {
    setShowExtendRequest(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-system`,
        sender: 'arbiter',
        senderAddress: ARBITER_ADDRESS,
        content: 'Extension requested. Dispute deadline moved by +14 days.',
        timestamp: Date.now(),
        type: 'system',
      },
    ]);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="relative w-full max-w-[860px] h-[calc(100dvh-3rem)] rounded-[2rem] border-0 bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`.hidden-scrollbar::-webkit-scrollbar{display:none;}`}</style>

        <div className="shrink-0 p-5 md:p-6 pb-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] relative z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-white tracking-tight truncate">Dispute Resolution</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
                Case #{order.orderId.toString().slice(-6)} • {timeRemaining}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="h-7 px-3 inline-flex items-center bg-[rgba(255,255,255,0.04)] rounded-full border border-[rgba(255,255,255,0.08)] text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                Disputed
              </span>
              <StudioModalCloseButton onClick={onClose} />
            </div>
          </div>
        </div>

        <section className="min-w-0 min-h-0 flex-1 overflow-y-auto lg:overflow-hidden hidden-scrollbar relative">
          <div className="h-full p-5 md:p-6 pt-4 relative z-10">
            <div className="w-full h-full max-w-[860px] mx-auto flex flex-col lg:flex-row justify-center items-start gap-6 px-0 md:px-2">
              <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-4 pr-1 min-h-0 h-auto lg:h-full overflow-visible">
                <div className={`${BASE_CARD} p-5 flex-1 min-h-0 flex flex-col`}>
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-[rgba(255,255,255,0.06)]">
                    <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-zinc-400">Case Thread</h3>
                    <span className="text-[10px] text-zinc-500 font-mono">{messages.length} events</span>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto hidden-scrollbar space-y-3 pr-1 pt-4">
                    {messages.map((message) => (
                      <div key={message.id}>
                        {message.type === 'system' ? (
                          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                            {message.content}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-black/40 p-3.5 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`h-6 px-2 inline-flex items-center rounded-md border text-[10px] font-bold uppercase tracking-widest ${roleBadgeClasses(message.sender)}`}
                              >
                                {roleIcon(message.sender)}
                                <span className="ml-1">{message.sender}</span>
                              </span>
                              <span className="text-[10px] text-zinc-600 font-mono">
                                {formatAddress(message.senderAddress)}
                              </span>
                            </div>

                            <p className="text-sm text-white leading-relaxed">{message.content}</p>

                            {message.proposal && (
                              <div className="space-y-2.5 pt-1">
                                <div className="flex flex-wrap gap-1.5 text-[10px]">
                                  {(['buyer', 'seller', 'arbiter'] as const).map((role) => (
                                    <span
                                      key={role}
                                      className={`px-2 py-1 rounded-full border ${
                                        message.proposal?.signatures[role]
                                          ? 'bg-[#2CC295]/15 border-[#2CC295]/30 text-[#2CC295]'
                                          : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.08)] text-zinc-500'
                                      }`}
                                    >
                                      {role}: {message.proposal?.signatures[role] ? 'signed' : 'pending'}
                                    </span>
                                  ))}
                                </div>

                                {message.proposal.status === 'pending' && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      onClick={() => signProposal(message.id)}
                                      className="h-10 rounded-full bg-[#2CC295] hover:bg-[#25a882] text-black text-sm font-bold transition-colors"
                                    >
                                      Sign
                                    </button>
                                    <button
                                      onClick={() => rejectProposal(message.id)}
                                      className="h-10 rounded-full bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-white text-sm font-bold transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}

                                {message.proposal.status === 'finalized' && (
                                  <div className="h-9 rounded-full bg-[#2CC295]/15 border border-[#2CC295]/30 text-[#2CC295] text-xs font-bold flex items-center justify-center gap-2">
                                    <CheckCircle2 size={14} />
                                    Finalized
                                  </div>
                                )}

                                {message.proposal.status === 'rejected' && (
                                  <div className="h-9 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold flex items-center justify-center">
                                    Rejected
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={endRef} />
                  </div>
                </div>

                <AnimatePresence>
                  {showProposalForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`${BASE_CARD} p-4 space-y-3`}>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => setProposalType('buyer_win')}
                            className={`h-10 rounded-lg text-xs font-bold transition-colors ${
                              proposalType === 'buyer_win'
                                ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                                : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-zinc-400'
                            }`}
                          >
                            Buyer Win
                          </button>
                          <button
                            onClick={() => setProposalType('seller_win')}
                            className={`h-10 rounded-lg text-xs font-bold transition-colors ${
                              proposalType === 'seller_win'
                                ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                                : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-zinc-400'
                            }`}
                          >
                            Seller Win
                          </button>
                          <button
                            onClick={() => setProposalType('split')}
                            className={`h-10 rounded-lg text-xs font-bold transition-colors ${
                              proposalType === 'split'
                                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                                : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-zinc-400'
                            }`}
                          >
                            Split
                          </button>
                        </div>

                        {proposalType === 'split' && (
                          <div className="space-y-2">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                              Buyer Share: {splitRatio}%
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={splitRatio}
                              onChange={(e) => setSplitRatio(parseInt(e.target.value, 10))}
                              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400"
                            />
                          </div>
                        )}

                        <div className="h-10 rounded-full bg-black/35 border border-[rgba(255,255,255,0.08)] px-4 flex items-center text-xs text-zinc-300">
                          {proposalPreview}
                        </div>

                        <button
                          onClick={submitProposal}
                          className="w-full h-10 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
                        >
                          Submit Proposal <ArrowRight size={14} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={`${BASE_CARD} p-4`}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 h-11 bg-black/40 border border-[rgba(255,255,255,0.08)] rounded-xl px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#2CC295]/30 focus:border-[#2CC295]"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="w-11 h-11 rounded-full bg-[#2CC295] hover:bg-[#25a882] text-black inline-flex items-center justify-center disabled:opacity-40 transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                  <button
                    onClick={() => setShowProposalForm((prev) => !prev)}
                    className="mt-2 w-full h-10 rounded-full bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-white text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    {showProposalForm ? 'Close Proposal Form' : 'Open Proposal Form'}
                  </button>
                </div>
              </div>

              <div className="w-full lg:w-[366px] max-w-[366px] flex flex-col gap-4 pr-1 min-h-0 h-auto lg:h-full overflow-visible lg:overflow-y-auto hidden-scrollbar">
                <div className={`${BASE_CARD} p-5 space-y-3`}>
                  <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-zinc-400">Timeline</h3>
                  <div className="rounded-xl bg-black/40 border border-[rgba(255,255,255,0.08)] p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Remaining</p>
                      <p className="text-sm font-bold text-white">{timeRemaining}</p>
                    </div>
                    <Clock size={16} className="text-amber-400" />
                  </div>
                  <button
                    onClick={() => setShowExtendRequest(true)}
                    className="w-full h-10 rounded-full bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-white text-sm font-bold transition-colors"
                  >
                    Request +14 Days
                  </button>
                </div>

                <div className={`${BASE_CARD} p-5 space-y-3`}>
                  <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-zinc-400">Order Summary</h3>
                  <div className="rounded-xl bg-black/40 border border-[rgba(255,255,255,0.08)] p-3 flex items-center gap-3">
                    <AssetThumb
                      src={order.assetImage}
                      alt={order.assetName}
                      className="w-14 h-14 rounded-xl bg-zinc-800 border border-[#27272a] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{order.assetName}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Qty {order.amount.toString()} • {formatEther(order.grossPrice)} ETH
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Buyer</span>
                      <span className="font-mono text-zinc-300">{formatAddress(order.buyer)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500">Seller</span>
                      <span className="font-mono text-zinc-300">{formatAddress(order.seller)}</span>
                    </div>
                  </div>
                </div>

                <div className={`${BASE_CARD} p-5 space-y-2`}>
                  <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-zinc-400">Dispute Reasons</h3>
                  {order.disputeReason.map((reason, index) => (
                    <div
                      key={`${reason}-${index}`}
                      className="rounded-lg bg-black/40 border border-[rgba(255,255,255,0.08)] p-2.5 text-xs text-zinc-300"
                    >
                      {reason}
                    </div>
                  ))}
                </div>

                <div className={`${BASE_CARD} p-5`}>
                  <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-zinc-400 mb-2">Comment</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">{order.disputeComment}</p>
                </div>

                {order.disputeEvidence.length > 0 && (
                  <div className={`${BASE_CARD} p-5`}>
                    <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-zinc-400 mb-3">Evidence</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {order.disputeEvidence.map((url, index) => (
                        <div
                          key={`${url}-${index}`}
                          className="aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-[rgba(255,255,255,0.08)]"
                        >
                          <img src={url} alt={`Evidence ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`${BASE_CARD} p-5`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      If no consensus is reached before deadline, escrow will auto-split 50/50.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <AnimatePresence>
          {showExtendRequest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-[2px]"
              onClick={() => setShowExtendRequest(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(18,18,18,0.92)] p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Clock size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Request Extension</h3>
                    <p className="text-sm text-zinc-400 mt-1">Ask arbiter to extend this dispute by +14 days.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowExtendRequest(false)}
                    className="h-11 rounded-full bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-white text-sm font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={requestExtension}
                    className="h-11 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold transition-colors"
                  >
                    Request
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body,
  );
}
