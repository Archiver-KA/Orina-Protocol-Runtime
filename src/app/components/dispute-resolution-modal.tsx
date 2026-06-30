import { AlertTriangle, ArrowUp, Bot, Clock, Loader2, Plus, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { usePublicClient } from 'wagmi';
import type { AIDisputeSuggestion } from '@/app/types/ai-agent';
import { AssetThumb } from '@/app/components/asset-thumb';
import { BorderlessTextarea } from '@/app/components/ai/borderless-textarea';
import { StudioActionButton } from '@/app/components/ui/studio-action-button';
import { ProtocolChainBanner } from '@/app/components/ui/protocol-chain-banner';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';
import { useDisputeAgreementSign } from '@/hooks/useEIP712Sign';
import {
  useDispute,
  useDisputePhase1Deadline,
  useExtendDispute,
  useResolveByAgreement,
  useResolveDispute,
} from '@/hooks/useDisputeManager';
import { useProtocolChain } from '@/hooks/useProtocolChain';
import { useProtocolDataNetwork } from '@/hooks/useProtocolDataNetwork';
import { useRequireWalletAction } from '@/hooks/useRequireWalletAction';
import { AIAgentClient } from '@/utils/aiAgentClient';
import type { DisputeProposalOutcome, DisputeProposalRecord, OrderUiRecord } from '@/types/order';
import {
  appendDisputeMessage,
  buildAIDisputeContext,
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
  currentUser?: `0x${string}`;
  userRole: 'buyer' | 'seller' | 'arbiter';
  onClose: () => void;
  onOrderUpdate: (order: OrderUiRecord) => void;
}

interface AttachedImage {
  url: string;
  file?: File;
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

const DISPUTE_REASON_LABELS: Record<string, string> = {
  not_received: 'Asset not received',
  wrong_item: 'Wrong asset delivered',
  damaged: 'Asset damaged or defective',
  not_as_described: 'Asset not as described',
  counterfeit: 'Suspected counterfeit asset',
  missing_parts: 'Missing parts or incomplete asset',
  other: 'Other issues',
};

function formatReasonLabel(reason: string) {
  return DISPUTE_REASON_LABELS[reason] ?? reason.replace(/_/g, ' ');
}

function formatThreadTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSuggestionHeadline(suggestion: AIDisputeSuggestion) {
  if (suggestion.verdict === 'buyer_win') return 'Buyer Wins';
  if (suggestion.verdict === 'seller_win') return 'Seller Wins';
  const buyerShare = suggestion.buyerSharePercent ?? 50;
  return `Split ${buyerShare}% / ${100 - buyerShare}%`;
}

export function DisputeResolutionModal({
  order,
  currentUser,
  userRole,
  onClose,
  onOrderUpdate,
}: DisputeResolutionModalProps) {
  const [newMessage, setNewMessage] = useState('');
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalType, setProposalType] = useState<DisputeProposalOutcome>('split');
  const [splitRatio, setSplitRatio] = useState(50);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<AIDisputeSuggestion | null>(null);
  const { chainId: liveChainId } = useProtocolDataNetwork();
  const publicClient = usePublicClient({ chainId: liveChainId ?? undefined });
  const protocolChain = useProtocolChain();
  const { requireWalletActionAsync } = useRequireWalletAction();
  const disputeRead = useDispute(order.orderId);
  const phase1Read = useDisputePhase1Deadline(order.orderId);
  const extendTx = useExtendDispute();
  const resolveAgreementTx = useResolveByAgreement();
  const resolveDisputeTx = useResolveDispute();
  const signAgreement = useDisputeAgreementSign();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const disputeCase = useMemo(() => getDisputeCase(order), [order]);
  const aiDisputeContext = useMemo(() => buildAIDisputeContext(order), [order]);
  const aiConversationId = useMemo(() => `orina-dispute-${order.orderId.toString()}`, [order.orderId]);
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
  const quantityLabel = formatOrderQuantity(order.amount, order.unitLabel, order.unitName);
  const grossPriceLabel = formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals);
  const shippingDetails = getOrderShippingDetails(order.shippingAddressSnapshot, order.shippingMethodLabel);
  const proposalShares = sharesFor(proposalType, splitRatio);
  const threadMessages = disputeCase.messages.length > 0
    ? disputeCase.messages
    : [{
      id: 'seed-system',
      sender: 'system' as const,
      content: 'Dispute is open on-chain. Shared projection is waiting for the first synced message.',
      timestamp: Date.now(),
      type: 'system' as const,
    }];
  const aiPromptPresets = [
    'Review this dispute and recommend a fair outcome.',
    'Analyze the current evidence quality and contradictions.',
    'Suggest a balanced split ratio if fault is shared.',
  ] as const;
  const hasVisibleAiReview = isAnalyzing || Boolean(aiError) || Boolean(aiSummary) || Boolean(aiSuggestion);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    setAiPrompt('');
    setAiSummary('');
    setAiError(null);
    setAiSuggestion(null);
  }, [order.orderId]);

  const pushOrderUpdate = (nextOrder: OrderUiRecord) => {
    upsertRuntimeOrder(nextOrder);
    onOrderUpdate(nextOrder);
  };

  const waitForReceipt = async (hash: `0x${string}`) => {
    if (!publicClient) throw new Error('Public client unavailable');
    return publicClient.waitForTransactionReceipt({ hash });
  };

  const ensureWalletReady = async (actionLabel: string, onSecurityCheckConfirmed?: () => void | Promise<void>) => {
    setStatusMessage(null);
    setActionError(null);
    if (!currentUser) {
      setActionError('Connect a wallet on the protocol network to write to this dispute.');
      return false;
    }
    if (
      !(await requireWalletActionAsync({
        capability: 'protocol_dispute_write',
        actionLabel,
        fallbackPage: 'orders',
        onSecurityCheckConfirmed,
      }))
    ) {
      return false;
    }
    return protocolChain.ensureProtocolChainAsync(actionLabel);
  };

  const handleSendMessage = () => {
    const trimmed = newMessage.trim();
    if (!trimmed && !attachedImage) return;
    if (!currentUser) {
      setActionError('Connect a wallet to post a shared dispute message.');
      return;
    }
    const nextOrder = appendDisputeMessage(
      order,
      userRole,
      currentUser,
      trimmed,
      attachedImage ? [attachedImage.url] : [],
    );
    pushOrderUpdate(nextOrder);
    setNewMessage('');
    setAttachedImage(null);
    setStatusMessage(attachedImage ? 'Message and image synced to shared dispute projection.' : 'Message synced to shared dispute projection.');
  };

  const handleSubmitProposal = async () => {
    const continueSubmitProposal = async () => {
      if (!(await ensureWalletReady('sign a dispute proposal', continueSubmitProposal))) return;
      if (disputeOpenedAt <= 0n) {
        setActionError('Dispute has not been hydrated from chain yet.');
        return;
      }

      try {
        const { buyerShareBps, sellerShareBps } = sharesFor(proposalType, splitRatio);
        setStatusMessage('Waiting for wallet signature...');
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

    await continueSubmitProposal();
  };

  const handleSignProposal = async (proposal: DisputeProposalRecord) => {
    const continueSignProposal = async () => {
      if (!(await ensureWalletReady('sign a dispute proposal', continueSignProposal))) return;
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

        setStatusMessage('2/3 agreement reached. Waiting for wallet transaction...');
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

    await continueSignProposal();
  };

  const handleRejectProposal = (proposalId: string) => {
    const nextOrder = rejectDisputeProposal(order, proposalId);
    pushOrderUpdate(nextOrder);
    setStatusMessage('Proposal marked as rejected in the shared projection.');
  };

  const handleExtend = async () => {
    const continueExtend = async () => {
      if (!canExtend) return;
      if (!(await ensureWalletReady('extend this dispute by +14 days', continueExtend))) return;

      try {
        setStatusMessage('Waiting for wallet transaction...');
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

    await continueExtend();
  };

  const handleArbiterResolve = async (proposal: DisputeProposalRecord) => {
    const continueArbiterResolve = async () => {
      if (!canArbiterResolve) return;
      if (!(await ensureWalletReady('resolve this dispute as arbiter', continueArbiterResolve))) return;

      setActiveProposalId(proposal.id);
      try {
        setStatusMessage('Waiting for wallet transaction...');
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

    await continueArbiterResolve();
  };

  const handleAnalyzeWithAI = async (presetPrompt?: string) => {
    if (!currentUser) {
      setAiError('Connect a wallet to run ORINA Arbitration AI.');
      return;
    }

    const message =
      (presetPrompt ?? aiPrompt).trim()
      || 'Review this dispute and recommend a fair outcome based on the current thread and evidence.';

    setAiError(null);
    setAiSummary('');
    setAiSuggestion(null);
    setIsAnalyzing(true);

    try {
      const response = await AIAgentClient.sendAssist({
        walletAddress: currentUser,
        message,
        conversationId: aiConversationId,
        agentContext: 'arbiter',
        disputeContext: aiDisputeContext,
        activePage: 'orders',
      });

      if (!response) {
        setAiError('Arbitration AI is temporarily unavailable for this dispute.');
        return;
      }

      const nextSuggestion = response.disputeSuggestion ?? response.dispute ?? null;
      setAiSummary(response.text ?? '');
      setAiSuggestion(nextSuggestion);
      setAiPrompt('');

      if (response.action === 'error_fallback') {
        setAiError(response.text || 'Arbitration AI could not complete this review.');
      } else if (!nextSuggestion && !response.text) {
        setAiError('Arbitration AI returned no usable review for this dispute.');
      }
    } catch (error) {
      console.error('dispute AI analysis failed', error);
      setAiError('Failed to run Arbitration AI for this dispute.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyAISuggestion = () => {
    if (!aiSuggestion) return;
    setProposalType(aiSuggestion.verdict);
    if (aiSuggestion.verdict === 'split') {
      setSplitRatio(aiSuggestion.buyerSharePercent ?? 50);
    }
    setShowProposalForm(true);
    setStatusMessage('Proposal form prefilled from ORINA Arbitration AI.');
  };

  if (typeof document === 'undefined') return null;

  const sectionShellClass = 'studio-portal-surface rounded-[28px] border border-ui-border-subtle bg-[var(--t-surface-5)]';
  const insetShellClass = 'rounded-[24px] border border-ui-border-subtle bg-[var(--t-surface-2)]';
  const inputClass = 'h-11 rounded-full border border-ui-border-subtle bg-ui-input px-4 text-sm text-ui-primary placeholder:text-ui-muted focus:outline-none';

  return createPortal(
    <div className="studio-portal-backdrop fixed inset-0 z-[75] flex items-center justify-center bg-black/72 p-4 backdrop-blur-[10px] sm:p-6 md:p-8" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="studio-modal-theme studio-portal-modal studio-glass-modal relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-[24px] border border-ui-border-subtle bg-[var(--color-ai-sidebar-shell)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="studio-glass-header shrink-0 border-b border-ui-border-subtle p-5 pb-4 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-ui-primary">Dispute Resolution</h1>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-ui-muted">
                Case #{order.orderId.toString()} • {order.assetName} • {disputeDeadline > 0n ? formatRemaining(disputeDeadline) : 'syncing'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 items-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-3 text-[9px] font-semibold uppercase tracking-widest text-ui-secondary">
                {isPhase2 ? 'Phase 2' : 'Phase 1'}
              </span>
              <StudioModalCloseButton onClick={onClose} />
            </div>
          </div>
        </div>

        <section className="min-w-0 min-h-0 flex-1 overflow-y-auto hidden-scrollbar">
          <div className="p-5 pt-4 md:p-6 md:pt-4 grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              <div className={`${sectionShellClass} space-y-4 p-4 md:p-5`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Dispute Conversation</h3>
                    <p className="mt-1 text-xs text-ui-muted">
                      {threadMessages.length} message(s) • {disputeCase.evidenceUrls.length} evidence item(s)
                    </p>
                  </div>
                  <span className="rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-3 py-1 text-[9px] font-semibold uppercase tracking-widest text-ui-secondary">
                    Live projection
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="mb-4 rounded-2xl border border-[var(--t-gold-soft-border)] bg-[var(--t-gold-soft-bg)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-ui-primary">
                        <Bot size={16} className="text-[var(--t-gold-title)]" />
                        <span>ORINA Arbitration AI</span>
                      </div>
                      <span className="rounded-full border border-[var(--t-gold-soft-border)] bg-[var(--t-gold-pill-bg)] px-3 py-1 text-[9px] font-semibold uppercase tracking-widest text-[var(--t-gold-pill-text)]">
                        Advisory
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-ui-secondary">
                      Arbitration AI now posts its latest review directly into the conversation below.
                    </p>
                  </div>

                  <div className="space-y-3 max-h-[520px] overflow-y-auto hidden-scrollbar pr-1">
                    {threadMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.sender === 'system'
                            ? 'justify-center'
                            : message.sender === userRole
                              ? 'justify-end'
                              : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[88%] rounded-[24px] border px-4 py-3 ${
                            message.sender === 'system'
                              ? 'border-ui-border-subtle bg-[var(--t-surface-2)] text-ui-secondary'
                              : message.sender === userRole
                                ? 'border-[#2CC295]/30 bg-[#2CC295]/10 text-ui-primary'
                                : 'border-ui-border-subtle bg-[var(--t-surface-2)] text-ui-primary'
                          }`}
                        >
                          <div className="mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-widest text-ui-muted">
                            <span>
                              {message.sender === userRole
                                ? 'You'
                                : message.sender === 'system'
                                  ? 'System'
                                  : message.sender.charAt(0).toUpperCase() + message.sender.slice(1)}
                            </span>
                            <span>•</span>
                            <span>{formatThreadTimestamp(message.timestamp)}</span>
                          </div>
                          {message.content.trim() ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p> : null}
                          {message.imageUrls && message.imageUrls.length > 0 ? (
                            <div className={`${message.content.trim() ? 'mt-3' : ''} grid grid-cols-1 gap-2 sm:grid-cols-2`}>
                              {message.imageUrls.map((url, index) => (
                                <a
                                  key={`${message.id}-image-${index}`}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="overflow-hidden rounded-2xl border border-ui-border-subtle bg-[var(--t-surface-2)]"
                                >
                                  <img src={url} alt={`Dispute attachment ${index + 1}`} className="h-36 w-full object-cover" />
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}

                    {hasVisibleAiReview ? (
                      <div className="flex justify-start">
                        <div className="max-w-[92%] space-y-3 rounded-[24px] border border-[var(--t-gold-soft-border)] bg-[var(--t-gold-soft-bg)] px-4 py-4">
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--t-gold-title)]">
                            <Bot size={13} />
                            <span>ORINA Arbitration AI</span>
                            <span>•</span>
                            <span>{isAnalyzing ? 'Reviewing now' : 'Latest review'}</span>
                          </div>

                          {isAnalyzing ? (
                            <div className="flex items-center gap-2 text-sm text-ui-primary">
                              <Loader2 size={16} className="animate-spin" />
                              <span>Reviewing the dispute thread, evidence, and proposal context.</span>
                            </div>
                          ) : null}

                          {aiError ? (
                            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-relaxed text-red-300">
                              {aiError}
                            </div>
                          ) : null}

                          {aiSummary ? (
                            <div className="whitespace-pre-wrap text-sm leading-relaxed text-ui-secondary">
                              {aiSummary}
                            </div>
                          ) : null}

                          {aiSuggestion ? (
                            <div className="space-y-3 rounded-2xl border border-[var(--t-gold-soft-border)] bg-[rgba(255,255,255,0.32)] p-4 dark:bg-black/15">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-ui-primary">{formatSuggestionHeadline(aiSuggestion)}</div>
                                  <div className="mt-1 text-[11px] text-ui-secondary">
                                    Buyer {aiSuggestion.buyerScore ?? 0}% vs Seller {aiSuggestion.sellerScore ?? 0}%
                                  </div>
                                </div>
                                <span className="rounded-full bg-[var(--t-gold-pill-bg)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--t-gold-pill-text)]">
                                  {Math.round(aiSuggestion.confidence * 100)}% confidence
                                </span>
                              </div>

                              <p className="text-xs leading-relaxed text-ui-secondary">{aiSuggestion.reasoning}</p>

                              {aiSuggestion.reasoningFactors && aiSuggestion.reasoningFactors.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Key Factors</div>
                                  <div className="space-y-1.5">
                                    {aiSuggestion.reasoningFactors.slice(0, 4).map((factor, index) => (
                                      <div key={`${factor}-${index}`} className="text-[11px] leading-relaxed text-ui-secondary">
                                        • {factor}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              <StudioActionButton
                                type="button"
                                onClick={handleApplyAISuggestion}
                                disabled={isBusy}
                                variant="primary"
                                size="md"
                                className="w-full bg-[var(--t-gold-solid)] text-sm text-black hover:bg-[var(--t-gold-solid-hover)] disabled:opacity-50"
                              >
                                Use Suggestion In Proposal Form
                              </StudioActionButton>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                {disputeCase.evidenceUrls.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Evidence Submitted</div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {disputeCase.evidenceUrls.slice(0, 8).map((url, index) => (
                        <a
                          key={`${url}-${index}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className={`${insetShellClass} overflow-hidden`}
                        >
                          <img src={url} alt={`Dispute evidence ${index + 1}`} className="h-20 w-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className={`${sectionShellClass} space-y-3 p-4`}>
                {attachedImage ? (
                  <div className="flex items-start gap-3 rounded-[20px] bg-[var(--t-surface-2)] p-3">
                    <div className="overflow-hidden rounded-[16px] border border-ui-border-subtle bg-[var(--t-surface-2)]">
                      <img src={attachedImage.url} alt="Pending dispute upload" className="h-20 w-20 object-cover" />
                    </div>
                    <div className="min-w-0 flex-1 text-xs text-ui-secondary">
                      <div className="font-semibold text-ui-primary">Image ready to send</div>
                      <div className="mt-1 truncate">{attachedImage.file?.name || 'Attached image'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedImage(null)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--t-surface-10)] text-ui-muted transition-colors hover:text-ui-primary"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : null}
                <div className="chat-composer-shell flex min-h-[56px] items-end gap-2 overflow-hidden rounded-[24px] px-3 py-2.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const url = event.target?.result as string;
                        setAttachedImage({ url, file });
                      };
                      reader.readAsDataURL(file);
                      e.currentTarget.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-[2px] flex h-8 w-8 items-center justify-center shrink-0 rounded-lg text-ui-muted transition-colors hover:text-ui-primary"
                    title="Upload image"
                  >
                    <Plus size={18} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <BorderlessTextarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={1}
                    autoResize
                    maxAutoHeight={96}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={currentUser ? 'Reply to the dispute thread...' : 'Connect wallet to post a message...'}
                    disabled={!currentUser || isBusy}
                    className="w-full resize-none bg-transparent px-1 py-1.5 text-sm leading-relaxed text-ui-primary placeholder:text-ui-muted overflow-y-auto"
                    style={{ minHeight: '22px', maxHeight: '96px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!currentUser || (!newMessage.trim() && !attachedImage) || isBusy}
                    className="chat-send-button mb-[2px]"
                  >
                    <ArrowUp size={16} strokeWidth={3} />
                  </button>
                </div>
                <StudioActionButton
                  type="button"
                  onClick={() => setShowProposalForm((prev) => !prev)}
                  disabled={!currentUser}
                  variant="secondary"
                  size="md"
                  className="w-full text-xs uppercase tracking-widest text-ui-primary"
                >
                  {showProposalForm ? 'Close Proposal Form' : 'Open Proposal Form'}
                </StudioActionButton>
                {showProposalForm ? (
                  <div className="space-y-3 border-t border-ui-border-subtle pt-3">
                    <div className="grid grid-cols-3 gap-2">
                      {(['buyer_win', 'seller_win', 'split'] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setProposalType(value)}
                          className={`h-10 rounded-full border px-4 text-xs font-semibold transition-colors ${
                            proposalType === value
                              ? 'border border-[var(--t-gold-soft-border)] bg-[var(--t-gold-soft-bg)] text-[var(--t-gold-title)]'
                              : 'border-ui-border-subtle bg-[var(--t-surface-2)] text-ui-secondary hover:bg-[var(--t-surface-10)] hover:text-ui-primary'
                          }`}
                        >
                          {value === 'buyer_win' ? 'Buyer Win' : value === 'seller_win' ? 'Seller Win' : 'Split'}
                        </button>
                      ))}
                    </div>
                    {proposalType === 'split' ? (
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-ui-muted">Buyer Share: {splitRatio}%</div>
                        <input type="range" min="0" max="100" step="1" value={splitRatio} onChange={(e) => setSplitRatio(parseInt(e.target.value, 10))} className="w-full" />
                      </div>
                    ) : null}
                    <div className="text-xs text-ui-secondary">{describeProposal(proposalType, proposalShares.buyerShareBps, proposalShares.sellerShareBps)}</div>
                    <StudioActionButton
                      type="button"
                      onClick={() => void handleSubmitProposal()}
                      disabled={!currentUser || isBusy}
                      variant="primary"
                      size="md"
                      className="w-full bg-[var(--t-gold-solid)] text-sm text-black hover:bg-[var(--t-gold-solid-hover)] disabled:opacity-50"
                    >
                      {signAgreement.isPending ? 'Open Wallet...' : 'Submit Proposal'}
                    </StudioActionButton>
                  </div>
                ) : null}
              </div>

              <div className={`${sectionShellClass} space-y-3 p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Run ORINA Arbitration AI</h3>
                    <p className="mt-1 text-xs leading-relaxed text-ui-secondary">
                      Launch an advisory review from here. The AI response is posted into the conversation card above.
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--t-gold-soft-border)] bg-[var(--t-gold-pill-bg)] px-3 py-1 text-[9px] font-semibold uppercase tracking-widest text-[var(--t-gold-pill-text)]">
                    Advisory
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {aiPromptPresets.map((prompt) => (
                    <StudioActionButton
                      key={prompt}
                      type="button"
                      onClick={() => void handleAnalyzeWithAI(prompt)}
                      disabled={!currentUser || isAnalyzing}
                      variant="secondary"
                      size="sm"
                      className="text-[11px] text-ui-primary disabled:opacity-40"
                    >
                      {prompt === 'Review this dispute and recommend a fair outcome.'
                        ? 'Review Case'
                        : prompt === 'Analyze the current evidence quality and contradictions.'
                          ? 'Check Evidence'
                          : 'Suggest Split'}
                    </StudioActionButton>
                  ))}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Bot size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ui-muted" />
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleAnalyzeWithAI();
                        }
                      }}
                      placeholder={currentUser ? 'Ask Arbitration AI to review this case...' : 'Connect wallet to run AI review...'}
                      disabled={!currentUser || isAnalyzing}
                      className={`w-full pl-9 pr-4 ${inputClass}`}
                    />
                  </div>
                  <StudioActionButton
                    type="button"
                    onClick={() => void handleAnalyzeWithAI()}
                    disabled={!currentUser || isAnalyzing}
                    variant="primary"
                    size="icon"
                    className="h-11 w-11 bg-[var(--t-gold-solid)] text-black hover:bg-[var(--t-gold-solid-hover)] disabled:opacity-40"
                    title="Run Arbitration AI"
                  >
                    {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  </StudioActionButton>
                </div>
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

              <div className={`${sectionShellClass} space-y-3 p-4`}>
                <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Open Proposals</h3>
                {disputeCase.proposals.length === 0 ? (
                  <div className="text-xs text-ui-muted">No proposal yet. Submit one to start the 2/3 agreement flow.</div>
                ) : (
                  <div className="space-y-3">
                    {disputeCase.proposals.map((proposal) => {
                      const signedByViewer = Boolean(proposal.signatures[userRole]);
                      const canSign = Boolean(currentUser) && proposal.status === 'pending' && !signedByViewer;
                      return (
                        <div key={proposal.id} className="space-y-3 border-t border-ui-border-subtle pt-3 first:border-t-0 first:pt-0">
                          <div>
                            <div className="text-sm font-semibold text-ui-primary">{describeProposal(proposal.outcome, proposal.buyerShareBps, proposal.sellerShareBps)}</div>
                            <div className="mt-1 text-[10px] text-ui-muted">
                              {countProposalSignatures(proposal)}/3 signatures • {proposal.status}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[10px] text-ui-secondary">
                            {(['buyer', 'seller', 'arbiter'] as const).map((role) => (
                              <span key={role} className={`rounded-full border px-2 py-1 ${proposal.signatures[role] ? 'border-[#2CC295]/30 bg-[#2CC295]/15 text-[#2CC295]' : 'border-ui-border-subtle bg-[var(--t-surface-2)] text-ui-secondary'}`}>
                                {role}: {proposal.signatures[role] ? 'signed' : 'pending'}
                              </span>
                            ))}
                          </div>
                          <div className="grid gap-2">
                            {canSign ? (
                              <StudioActionButton
                                type="button"
                                onClick={() => void handleSignProposal(proposal)}
                                disabled={isBusy && activeProposalId === proposal.id}
                                variant="primary"
                                size="md"
                                className="text-sm disabled:opacity-50"
                              >
                                {activeProposalId === proposal.id ? 'Open Wallet...' : 'Sign Proposal'}
                              </StudioActionButton>
                            ) : (
                              <div className="flex h-10 items-center justify-center rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] text-sm font-semibold text-ui-secondary">
                                {signedByViewer ? 'You already signed' : 'Waiting for another signer'}
                              </div>
                            )}
                            {!signedByViewer && proposal.status === 'pending' ? (
                              <StudioActionButton
                                type="button"
                                onClick={() => handleRejectProposal(proposal.id)}
                                variant="secondary"
                                size="md"
                                className="text-sm text-ui-primary"
                              >
                                Reject in Thread
                              </StudioActionButton>
                            ) : null}
                            {canArbiterResolve && proposal.status === 'pending' ? (
                              <StudioActionButton
                                type="button"
                                onClick={() => void handleArbiterResolve(proposal)}
                                disabled={isBusy && activeProposalId === proposal.id}
                                variant="primary"
                                size="md"
                                className="bg-[var(--t-gold-solid)] text-sm text-black hover:bg-[var(--t-gold-solid-hover)] disabled:opacity-50"
                              >
                                {activeProposalId === proposal.id ? 'Open Wallet...' : 'Arbiter Resolve'}
                              </StudioActionButton>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`${sectionShellClass} space-y-3 p-5`}>
                <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Timeline</h3>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-ui-muted">Remaining</p>
                    <p className="text-sm font-semibold text-ui-primary">{disputeDeadline > 0n ? formatRemaining(disputeDeadline) : 'Syncing...'}</p>
                  </div>
                  <Clock size={16} className="text-[var(--t-gold-title)]" />
                </div>
                <div className="text-[11px] leading-relaxed text-ui-secondary">
                  {isPhase2
                    ? 'Phase 2 active. Arbiter unilateral fallback is now available until the final deadline.'
                    : 'Phase 1 active. Any 2 of buyer, seller, or arbiter can close the dispute early by signing the same proposal.'}
                </div>
                {canExtend ? (
                  <StudioActionButton
                    type="button"
                    onClick={() => void handleExtend()}
                    disabled={isBusy}
                    variant="secondary"
                    size="md"
                    className="w-full text-sm text-ui-primary disabled:opacity-50"
                  >
                    {extendTx.isPending || extendTx.isConfirming ? 'Open Wallet...' : 'Request +14 Days'}
                  </StudioActionButton>
                ) : null}
              </div>

              <div className={`${sectionShellClass} space-y-3 p-5`}>
                <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Order Summary</h3>
                <div className="flex items-center gap-3">
                  <AssetThumb src={order.assetImage} alt={order.assetName} className="w-14 h-14 rounded-xl bg-zinc-800 border border-[#27272a] shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ui-primary">{order.assetName}</p>
                    <p className="mt-1 text-[10px] text-ui-muted">{quantityLabel} • {grossPriceLabel}</p>
                  </div>
                </div>
                <div className="grid gap-2 text-[11px] text-ui-secondary">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-ui-muted">Buyer</span>
                    <span className="font-mono text-ui-primary">{formatAddress(order.buyer)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-ui-muted">Seller</span>
                    <span className="font-mono text-ui-primary">{formatAddress(order.seller)}</span>
                  </div>
                </div>
                {hasOrderShippingDetails(shippingDetails) ? (
                  <div className="space-y-2 border-t border-ui-border-subtle pt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-ui-muted">Shipping Snapshot</p>
                    {shippingDetails.methodLabel ? <p className="text-xs font-semibold text-[var(--t-gold-title)]">{shippingDetails.methodLabel}</p> : null}
                    {shippingDetails.recipientName ? <p className="text-xs text-ui-primary">{shippingDetails.recipientName}</p> : null}
                    {shippingDetails.address ? <p className="text-[11px] leading-relaxed text-ui-secondary">{shippingDetails.address}</p> : null}
                    {shippingDetails.phone ? <p className="text-[10px] text-ui-muted">{shippingDetails.phone}</p> : null}
                    {shippingDetails.instructions ? (
                      <p className="text-[10px] leading-relaxed text-ui-muted">
                        Instructions: {shippingDetails.instructions}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {disputeCase.reasons.length > 0 ? (
                <div className={`${sectionShellClass} space-y-2 p-5`}>
                  <h3 className="text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Dispute Reasons</h3>
                  {disputeCase.reasons.map((reason, index) => (
                    <div key={`${reason}-${index}`} className="rounded-full border border-ui-border-subtle bg-[var(--t-surface-2)] px-3 py-2 text-xs text-ui-secondary">
                      {formatReasonLabel(reason)}
                    </div>
                  ))}
                </div>
              ) : null}

              {disputeCase.comment ? (
                <div className={`${sectionShellClass} p-5`}>
                  <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[1px] text-ui-muted">Opening Comment</h3>
                  <p className="text-xs leading-relaxed text-ui-secondary">{disputeCase.comment}</p>
                </div>
              ) : null}

              {actionError ? <div className="rounded-[24px] bg-red-500/10 border border-red-500/25 p-4 text-xs text-red-300">{actionError}</div> : null}
              {statusMessage ? <div className={`${sectionShellClass} p-4 text-xs text-ui-secondary`}>{statusMessage}</div> : null}

              <div className={`${sectionShellClass} p-5`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--t-gold-title)]" />
                  <p className="text-xs leading-relaxed text-ui-secondary">
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
