import { AlertTriangle, CheckCircle2, Clock, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { usePublicClient } from 'wagmi';
import { AssetThumb } from '@/app/components/asset-thumb';
import { ProtocolChainBanner } from '@/app/components/ui/protocol-chain-banner';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { ACTIVE_CHAIN_ID } from '@/config/contracts';
import { useDisputeAgreementSign } from '@/hooks/useEIP712Sign';
import {
  useDispute,
  useDisputePhase1Deadline,
  useExtendDispute,
  useResolveByAgreement,
  useResolveDispute,
} from '@/hooks/useDisputeManager';
import { useProtocolChain } from '@/hooks/useProtocolChain';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import type { DisputeProposalOutcome, DisputeProposalRecord, OrderUiRecord } from '@/types/order';
import {
  appendDisputeMessage,
  countProposalSignatures,
  createDisputeProposal,
  describeProposal,
  getDisputeCase,
  markDisputeExtended,
  rejectDisputeProposal,
  signDisputeProposal,
} from '@/utils/disputeCase';
import { formatAddress } from '@/utils/format';
import {
  formatOrderGrossPrice,
  formatOrderQuantity,
  getOrderShippingDetails,
  hasOrderShippingDetails,
} from '@/utils/orderDisplay';
import { upsertRuntimeOrder } from '@/utils/runtimeOrders';
import { getWalletErrorMessage } from '@/utils/walletErrors';

interface DisputeResolutionModalProps {
  order: OrderUiRecord;
  currentUser: `0x${string}`;
  userRole: 'buyer' | 'seller' | 'arbiter';
  onClose: () => void;
  onOrderUpdate: (order: OrderUiRecord) => void;
}

type DisputeSnapshot = readonly [boolean, number, bigint, bigint, boolean, bigint, bigint];
const ZERO_SIG = '0x' as `0x${string}`;

function verdictCode(outcome: DisputeProposalOutcome) {
  return outcome === 'buyer_win' ? 1 : outcome === 'seller_win' ? 2 : 3;
}

function sharesFor(outcome: DisputeProposalOutcome, buyerSharePercent: number) {
  if (outcome !== 'split') return { buyerShareBps: 0, sellerShareBps: 0 };
  const bounded = Math.min(100, Math.max(0, buyerSharePercent));
  return {
    buyerShareBps: bounded * 100,
    sellerShareBps: 10000 - bounded * 100,
  };
}

function formatRemaining(deadlineSec: bigint) {
  const diff = Number(deadlineSec) - Math.floor(Date.now() / 1000);
  if (diff <= 0) return 'Expired';
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

export function DisputeResolutionModal({
  order,
  currentUser,
  userRole,
  onClose,
  onOrderUpdate,
}: DisputeResolutionModalProps) {
  const [newMessage, setNewMessage] = useState('');
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalType, setProposalType] = useState<DisputeProposalOutcome>('split');
  const [splitRatio, setSplitRatio] = useState(50);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN_ID });
  const protocolChain = useProtocolChain();
  const { requireWalletActionAsync } = useRequireWalletAction();
  const disputeRead = useDispute(order.orderId);
  const phase1Read = useDisputePhase1Deadline(order.orderId);
  const extendTx = useExtendDispute();
  const resolveAgreementTx = useResolveByAgreement();
  const resolveDisputeTx = useResolveDispute();
  const signAgreement = useDisputeAgreementSign();

  const disputeCase = useMemo(() => getDisputeCase(order), [order]);
  const chainDispute = disputeRead.data as DisputeSnapshot | undefined;
  const disputeOpenedAt = chainDispute?.[2] && chainDispute[2] > 0n ? chainDispute[2] : (order.disputeOpenedAt ?? 0n);
  const disputeDeadline = chainDispute?.[3] && chainDispute[3] > 0n ? chainDispute[3] : (order.disputeDeadline ?? 0n);
  const disputeExtended = chainDispute?.[4] ?? order.disputeExtended ?? false;
  const phase1Deadline = (phase1Read.data as bigint | undefined) ?? (disputeOpenedAt > 0n ? disputeOpenedAt + 14n * 24n * 60n * 60n : 0n);
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const isPhase2 = disputeExtended && phase1Deadline > 0n && nowSec >= phase1Deadline;
  const canExtend = userRole === 'arbiter' && !disputeExtended && phase1Deadline > 0n && nowSec < phase1Deadline;
  const canArbiterResolve = userRole === 'arbiter' && isPhase2 && disputeDeadline > 0n && nowSec < disputeDeadline;
  const isBusy =
    signAgreement.isPending
    || extendTx.isPending
    || extendTx.isConfirming
    || resolveAgreementTx.isPending
    || resolveAgreementTx.isConfirming
    || resolveDisputeTx.isPending
    || resolveDisputeTx.isConfirming;
  const quantityLabel = formatOrderQuantity(order.amount, order.unitName);
  const grossPriceLabel = formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals);
  const shippingDetails = getOrderShippingDetails(order.shippingAddressSnapshot, order.shippingMethodLabel);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const pushOrderUpdate = (nextOrder: OrderUiRecord) => {
    upsertRuntimeOrder(nextOrder);
    onOrderUpdate(nextOrder);
  };

  const waitForReceipt = async (hash: `0x${string}`) => {
    if (!publicClient) throw new Error('Public client unavailable');
    return publicClient.waitForTransactionReceipt({ hash });
  };

  const ensureWalletReady = async (actionLabel: string) => {
    setStatusMessage(null);
    setActionError(null);
    if (
      !(await requireWalletActionAsync({
        capability: 'protocol_dispute_write',
        actionLabel,
        fallbackPage: 'orders',
      }))
    ) {
      return false;
    }
    return protocolChain.ensureProtocolChainAsync(actionLabel);
  };

  const handleSendMessage = () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    const nextOrder = appendDisputeMessage(order, userRole, currentUser, trimmed);
    pushOrderUpdate(nextOrder);
    setNewMessage('');
    setStatusMessage('Message synced to shared dispute projection.');
  };

  const handleSubmitProposal = async () => {
    if (!(await ensureWalletReady('sign a dispute proposal'))) return;
    if (disputeOpenedAt <= 0n) {
      setActionError('Dispute has not been hydrated from chain yet.');
      return;
    }

    try {
      const { buyerShareBps, sellerShareBps } = sharesFor(proposalType, splitRatio);
      setStatusMessage('Waiting for MetaMask signature...');
      const signature = await signAgreement.sign({
        orderId: order.orderId,
        verdict: verdictCode(proposalType),
        buyerShareBps: BigInt(buyerShareBps),
        sellerShareBps: BigInt(sellerShareBps),
        openedAt: disputeOpenedAt,
      });
      const nextOrder = createDisputeProposal(order, {
        outcome: proposalType,
        buyerShareBps,
        sellerShareBps,
        proposerRole: userRole,
        proposerAddress: currentUser,
        signature,
      });
      pushOrderUpdate(nextOrder);
      setShowProposalForm(false);
      setStatusMessage('Proposal signed and shared. Waiting for a second signer.');
    } catch (error) {
      setActionError(getWalletErrorMessage(error, 'Proposal signing failed.'));
    }
  };

  const handleSignProposal = async (proposal: DisputeProposalRecord) => {
    if (!(await ensureWalletReady('sign a dispute proposal'))) return;
    if (proposal.signatures[userRole]) {
      setStatusMessage('You already signed this proposal.');
      return;
    }
    if (disputeOpenedAt <= 0n) {
      setActionError('Dispute has not been hydrated from chain yet.');
      return;
    }

    setActiveProposalId(proposal.id);
    try {
      const signature = await signAgreement.sign({
        orderId: order.orderId,
        verdict: verdictCode(proposal.outcome),
        buyerShareBps: BigInt(proposal.buyerShareBps),
        sellerShareBps: BigInt(proposal.sellerShareBps),
        openedAt: disputeOpenedAt,
      });

      const signedProjection = signDisputeProposal(order, proposal.id, userRole, currentUser, signature);
      pushOrderUpdate(signedProjection);
      const signedProposal = getDisputeCase(signedProjection).proposals.find((item) => item.id === proposal.id);
      if (!signedProposal || countProposalSignatures(signedProposal) < 2) {
        setStatusMessage('Signature stored. Waiting for one more signer to reach 2/3 agreement.');
        return;
      }

      setStatusMessage('2/3 agreement reached. Waiting for MetaMask transaction...');
      const txHash = await resolveAgreementTx.resolveByAgreement(
        order.orderId,
        verdictCode(signedProposal.outcome),
        BigInt(signedProposal.buyerShareBps),
        BigInt(signedProposal.sellerShareBps),
        signedProposal.signatures.buyer ?? ZERO_SIG,
        signedProposal.signatures.seller ?? ZERO_SIG,
        signedProposal.signatures.arbiter ?? ZERO_SIG,
      );
      await waitForReceipt(txHash);

      const resolvedOrder = signDisputeProposal(signedProjection, proposal.id, userRole, currentUser, signature, {
        status: 'resolved',
        resolvedTxHash: txHash,
        resolutionLabel: `Proposal resolved on-chain. Tx ${txHash.slice(0, 10)}...${txHash.slice(-6)}.`,
      });
      pushOrderUpdate(resolvedOrder);
      setStatusMessage('Dispute resolved on-chain via 2/3 agreement.');
    } catch (error) {
      setActionError(getWalletErrorMessage(error, 'Proposal signing or execution failed.'));
    } finally {
      setActiveProposalId(null);
    }
  };

  const handleRejectProposal = (proposalId: string) => {
    const nextOrder = rejectDisputeProposal(order, proposalId);
    pushOrderUpdate(nextOrder);
    setStatusMessage('Proposal marked as rejected in the shared projection.');
  };

  const handleExtend = async () => {
    if (!canExtend) return;
    if (!(await ensureWalletReady('extend this dispute by +14 days'))) return;

    try {
      setStatusMessage('Waiting for MetaMask transaction...');
      const txHash = await extendTx.extendDispute(order.orderId);
      await waitForReceipt(txHash);
      const nextOrder = markDisputeExtended({
        ...order,
        disputeDeadline: phase1Deadline > 0n ? phase1Deadline + 14n * 24n * 60n * 60n : order.disputeDeadline,
        disputeExtended: true,
      }, txHash);
      pushOrderUpdate(nextOrder);
      setStatusMessage('Dispute extended by +14 days on-chain.');
    } catch (error) {
      setActionError(getWalletErrorMessage(error, 'Dispute extension failed.'));
    }
  };

  const handleArbiterResolve = async (proposal: DisputeProposalRecord) => {
    if (!canArbiterResolve) return;
    if (!(await ensureWalletReady('resolve this dispute as arbiter'))) return;

    setActiveProposalId(proposal.id);
    try {
      setStatusMessage('Waiting for MetaMask transaction...');
      const txHash = await resolveDisputeTx.resolveDispute(
        order.orderId,
        verdictCode(proposal.outcome),
        BigInt(proposal.buyerShareBps),
        BigInt(proposal.sellerShareBps),
      );
      await waitForReceipt(txHash);
      const resolvedOrder = signDisputeProposal(order, proposal.id, 'arbiter', currentUser, ZERO_SIG, {
        status: 'resolved',
        resolvedTxHash: txHash,
        resolutionLabel: `Arbiter resolved this dispute on-chain. Tx ${txHash.slice(0, 10)}...${txHash.slice(-6)}.`,
      });
      pushOrderUpdate(resolvedOrder);
      setStatusMessage('Arbiter resolution mined successfully.');
    } catch (error) {
      setActionError(getWalletErrorMessage(error, 'Arbiter resolution failed.'));
    } finally {
      setActiveProposalId(null);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="studio-portal-backdrop fixed inset-0 z-[75] flex items-center justify-center p-4 md:p-6 bg-black/70 backdrop-blur-[10px]" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="studio-modal-theme studio-portal-modal relative w-full max-w-[860px] h-[calc(100dvh-3rem)] rounded-[2rem] border-0 bg-[rgba(18,18,18,0.86)] backdrop-blur-[20px] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="studio-portal-header shrink-0 p-5 md:p-6 pb-4 border-b border-[rgba(255,255,255,0.06)] bg-[rgba(18,18,18,0.86)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-white">Dispute Resolution</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">
                Case #{order.orderId.toString()} • {disputeDeadline > 0n ? formatRemaining(disputeDeadline) : 'syncing'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-7 px-3 inline-flex items-center bg-[rgba(255,255,255,0.04)] rounded-full border border-[rgba(255,255,255,0.08)] text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                {isPhase2 ? 'Phase 2' : 'Phase 1'}
              </span>
              <StudioModalCloseButton onClick={onClose} />
            </div>
          </div>
        </div>

        <section className="min-w-0 min-h-0 flex-1 overflow-y-auto hidden-scrollbar">
          <div className="p-5 md:p-6 pt-4 grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className="rounded-[24px] bg-[rgba(24,24,27,0.4)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-zinc-400">Case Thread</h3>
                  <span className="text-[10px] text-zinc-500 font-mono">{disputeCase.messages.length} events</span>
                </div>
                <div className="space-y-3 max-h-[320px] overflow-y-auto hidden-scrollbar">
                  {(disputeCase.messages.length > 0 ? disputeCase.messages : [{
                    id: 'seed-system',
                    sender: 'system' as const,
                    content: 'Dispute is open on-chain. Shared projection is waiting for the first synced message.',
                    timestamp: Date.now(),
                    type: 'system' as const,
                  }]).map((message) => (
                    <div key={message.id} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-black/40 p-3 text-sm text-white">
                      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">{message.sender}</div>
                      {message.content}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] bg-[rgba(24,24,27,0.4)] p-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 h-11 bg-black/40 border border-[rgba(255,255,255,0.08)] rounded-xl px-4 text-sm text-white placeholder:text-zinc-600"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isBusy}
                    className="w-11 h-11 rounded-full bg-[#2CC295] hover:bg-[#25a882] text-black inline-flex items-center justify-center disabled:opacity-40"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <button
                  onClick={() => setShowProposalForm((prev) => !prev)}
                  className="w-full h-10 rounded-full bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-white text-xs font-bold uppercase tracking-widest"
                >
                  {showProposalForm ? 'Close Proposal Form' : 'Open Proposal Form'}
                </button>
                {showProposalForm ? (
                  <div className="space-y-3 border-t border-[rgba(255,255,255,0.06)] pt-3">
                    <div className="grid grid-cols-3 gap-2">
                      {(['buyer_win', 'seller_win', 'split'] as const).map((value) => (
                        <button
                          key={value}
                          onClick={() => setProposalType(value)}
                          className={`h-10 rounded-lg text-xs font-bold ${
                            proposalType === value
                              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                              : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-zinc-400'
                          }`}
                        >
                          {value === 'buyer_win' ? 'Buyer Win' : value === 'seller_win' ? 'Seller Win' : 'Split'}
                        </button>
                      ))}
                    </div>
                    {proposalType === 'split' ? (
                      <div className="space-y-2">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Buyer Share: {splitRatio}%</div>
                        <input type="range" min="0" max="100" step="1" value={splitRatio} onChange={(e) => setSplitRatio(parseInt(e.target.value, 10))} className="w-full" />
                      </div>
                    ) : null}
                    <div className="text-xs text-zinc-300">{describeProposal(proposalType, sharesFor(proposalType, splitRatio).buyerShareBps, sharesFor(proposalType, splitRatio).sellerShareBps)}</div>
                    <button onClick={() => void handleSubmitProposal()} disabled={isBusy} className="w-full h-10 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold disabled:opacity-50">
                      {signAgreement.isPending ? 'Open MetaMask...' : 'Submit Proposal'}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[24px] bg-[rgba(24,24,27,0.4)] p-4 space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-zinc-400">Open Proposals</h3>
                {disputeCase.proposals.length === 0 ? (
                  <div className="text-xs text-zinc-500">No proposal yet. Submit one to start the 2/3 agreement flow.</div>
                ) : (
                  <div className="space-y-3">
                    {disputeCase.proposals.map((proposal) => {
                      const signedByViewer = Boolean(proposal.signatures[userRole]);
                      const canSign = proposal.status === 'pending' && !signedByViewer;
                      return (
                        <div key={proposal.id} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-black/40 p-3 space-y-3">
                          <div>
                            <div className="text-sm font-bold text-white">{describeProposal(proposal.outcome, proposal.buyerShareBps, proposal.sellerShareBps)}</div>
                            <div className="text-[10px] text-zinc-500 mt-1">
                              {countProposalSignatures(proposal)}/3 signatures • {proposal.status}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[10px] text-zinc-400">
                            {(['buyer', 'seller', 'arbiter'] as const).map((role) => (
                              <span key={role} className={`px-2 py-1 rounded-full border ${proposal.signatures[role] ? 'bg-[#2CC295]/15 border-[#2CC295]/30 text-[#2CC295]' : 'border-[rgba(255,255,255,0.08)]'}`}>
                                {role}: {proposal.signatures[role] ? 'signed' : 'pending'}
                              </span>
                            ))}
                          </div>
                          <div className="grid gap-2">
                            {canSign ? (
                              <button onClick={() => void handleSignProposal(proposal)} disabled={isBusy && activeProposalId === proposal.id} className="h-10 rounded-full bg-[#2CC295] hover:bg-[#25a882] text-black text-sm font-bold disabled:opacity-50">
                                {activeProposalId === proposal.id ? 'Open MetaMask...' : 'Sign Proposal'}
                              </button>
                            ) : (
                              <div className="h-10 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-zinc-400 text-sm font-bold flex items-center justify-center">
                                {signedByViewer ? 'You already signed' : 'Waiting for another signer'}
                              </div>
                            )}
                            {!signedByViewer && proposal.status === 'pending' ? (
                              <button onClick={() => handleRejectProposal(proposal.id)} className="h-10 rounded-full bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-white text-sm font-bold">
                                Reject in Thread
                              </button>
                            ) : null}
                            {canArbiterResolve && proposal.status === 'pending' ? (
                              <button onClick={() => void handleArbiterResolve(proposal)} disabled={isBusy && activeProposalId === proposal.id} className="h-10 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-sm font-bold disabled:opacity-50">
                                {activeProposalId === proposal.id ? 'Open MetaMask...' : 'Arbiter Resolve'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <ProtocolChainBanner
                isConnected={protocolChain.isConnected}
                isOnProtocolChain={protocolChain.isOnProtocolChain}
                currentChainLabel={protocolChain.currentChainLabel}
                targetChainLabel={protocolChain.targetChainLabel}
                isSwitching={protocolChain.isSwitching}
                onSwitch={() => protocolChain.ensureProtocolChainAsync('manage dispute resolution')}
                showWhenMatched={false}
              />

              <div className="rounded-[24px] bg-[rgba(24,24,27,0.4)] p-5 space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-zinc-400">Timeline</h3>
                <div className="rounded-xl bg-black/40 border border-[rgba(255,255,255,0.08)] p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Remaining</p>
                    <p className="text-sm font-bold text-white">{disputeDeadline > 0n ? formatRemaining(disputeDeadline) : 'Syncing...'}</p>
                  </div>
                  <Clock size={16} className="text-amber-400" />
                </div>
                <div className="text-[11px] text-zinc-400 leading-relaxed">
                  {isPhase2
                    ? 'Phase 2 active. Arbiter unilateral fallback is now available until the final deadline.'
                    : 'Phase 1 active. Any 2 of buyer, seller, or arbiter can close the dispute early by signing the same proposal.'}
                </div>
                {canExtend ? (
                  <button onClick={() => void handleExtend()} disabled={isBusy} className="w-full h-10 rounded-full bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-white text-sm font-bold disabled:opacity-50">
                    {extendTx.isPending || extendTx.isConfirming ? 'Open MetaMask...' : 'Request +14 Days'}
                  </button>
                ) : null}
              </div>

              <div className="rounded-[24px] bg-[rgba(24,24,27,0.4)] p-5 space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-zinc-400">Order Summary</h3>
                <div className="rounded-xl bg-black/40 border border-[rgba(255,255,255,0.08)] p-3 flex items-center gap-3">
                  <AssetThumb src={order.assetImage} alt={order.assetName} className="w-14 h-14 rounded-xl bg-zinc-800 border border-[#27272a] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{order.assetName}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">{quantityLabel} • {grossPriceLabel}</p>
                  </div>
                </div>
                <div className="grid gap-2 text-[11px] text-zinc-400">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-zinc-500">Buyer</span>
                    <span className="font-mono text-white">{formatAddress(order.buyer)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-zinc-500">Seller</span>
                    <span className="font-mono text-white">{formatAddress(order.seller)}</span>
                  </div>
                </div>
                {hasOrderShippingDetails(shippingDetails) ? (
                  <div className="rounded-xl bg-black/40 border border-[rgba(255,255,255,0.08)] p-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Shipping Snapshot</p>
                    {shippingDetails.methodLabel ? <p className="text-xs font-bold text-amber-300">{shippingDetails.methodLabel}</p> : null}
                    {shippingDetails.recipientName ? <p className="text-xs text-white">{shippingDetails.recipientName}</p> : null}
                    {shippingDetails.address ? <p className="text-[11px] text-zinc-400 leading-relaxed">{shippingDetails.address}</p> : null}
                    {shippingDetails.phone ? <p className="text-[10px] text-zinc-500">{shippingDetails.phone}</p> : null}
                    {shippingDetails.instructions ? (
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        Instructions: {shippingDetails.instructions}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {disputeCase.reasons.length > 0 ? (
                <div className="rounded-[24px] bg-[rgba(24,24,27,0.4)] p-5 space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-zinc-400">Dispute Reasons</h3>
                  {disputeCase.reasons.map((reason, index) => (
                    <div key={`${reason}-${index}`} className="rounded-lg bg-black/40 border border-[rgba(255,255,255,0.08)] p-2.5 text-xs text-zinc-300">
                      {reason}
                    </div>
                  ))}
                </div>
              ) : null}

              {disputeCase.comment ? (
                <div className="rounded-[24px] bg-[rgba(24,24,27,0.4)] p-5">
                  <h3 className="text-[10px] font-bold uppercase tracking-[1px] text-zinc-400 mb-2">Opening Comment</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">{disputeCase.comment}</p>
                </div>
              ) : null}

              {actionError ? <div className="rounded-[24px] bg-red-500/10 border border-red-500/25 p-4 text-xs text-red-300">{actionError}</div> : null}
              {statusMessage ? <div className="rounded-[24px] bg-[rgba(24,24,27,0.4)] border border-[rgba(255,255,255,0.08)] p-4 text-xs text-zinc-300">{statusMessage}</div> : null}

              <div className="rounded-[24px] bg-[rgba(24,24,27,0.4)] p-5">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    If no agreement closes the case before the deadline, protocol auto-splits 50/50 after dispute fee.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </motion.div>
    </div>,
    document.body,
  );
}
