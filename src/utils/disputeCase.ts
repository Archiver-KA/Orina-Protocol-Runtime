import type { AIDisputeContext } from '@/app/types/ai-agent';
import type {
  DisputeCaseProjection,
  DisputeParticipantRole,
  DisputeProposalOutcome,
  DisputeProposalRecord,
  DisputeThreadMessage,
  OrderUiRecord,
} from '@/types/order';
import { formatOrderGrossPrice } from '@/utils/orderDisplay';

function buildSystemMessage(content: string, timestamp = Date.now(), proposalId?: string): DisputeThreadMessage {
  return {
    id: `system-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    sender: 'system',
    content,
    timestamp,
    type: proposalId ? 'proposal' : 'system',
    proposalId,
  };
}

export function getDisputeCase(order: OrderUiRecord): DisputeCaseProjection {
  return order.disputeCase ?? {
    reasons: [],
    comment: '',
    evidenceUrls: [],
    messages: [],
    proposals: [],
  };
}

function bigintToIsoString(value?: bigint) {
  if (!value || value <= 0n) return undefined;
  return new Date(Number(value) * 1000).toISOString();
}

function joinMessagesBySender(messages: DisputeThreadMessage[], sender: Exclude<DisputeParticipantRole, 'system'>) {
  const chunks = messages
    .filter((message) => message.sender === sender && message.type === 'message')
    .map((message) => message.content.trim())
    .filter(Boolean);

  return chunks.length > 0 ? chunks.join('\n\n') : undefined;
}

export function buildAIDisputeContext(order: OrderUiRecord): AIDisputeContext {
  const disputeCase = getDisputeCase(order);
  const buyerComment = disputeCase.comment.trim() || joinMessagesBySender(disputeCase.messages, 'buyer');
  const sellerResponse = joinMessagesBySender(disputeCase.messages, 'seller');

  return {
    orderId: order.orderId.toString(),
    disputeReasons: disputeCase.reasons,
    buyerReasons: disputeCase.reasons,
    evidenceUrls: disputeCase.evidenceUrls,
    buyerComment,
    sellerResponse,
    grossPriceFormatted: formatOrderGrossPrice(order.grossPrice, order.paymentTokenSymbol, order.paymentTokenDecimals),
    orderAmount: order.grossPrice.toString(),
    openedAt: bigintToIsoString(order.disputeOpenedAt),
    deadline: bigintToIsoString(order.disputeDeadline),
    deliveryConfirmed: Boolean(order.deliveryConfirmed),
    messages: disputeCase.messages.map((message) => ({
      sender: message.sender,
      content: message.content,
    })),
  };
}

export function withDisputeCase(order: OrderUiRecord, disputeCase: DisputeCaseProjection): OrderUiRecord {
  return {
    ...order,
    disputed: true,
    disputeCase,
    updatedAt: Date.now(),
  };
}

export function createDisputeProjection(
  order: OrderUiRecord,
  params: {
    reasons: string[];
    comment: string;
    evidenceUrls: string[];
    openerRole: DisputeParticipantRole;
    openerAddress: `0x${string}`;
  },
): OrderUiRecord {
  const timestamp = Date.now();
  const reasonLabel = params.reasons.length > 0 ? params.reasons.join(', ') : 'No reasons provided';
  const messages: DisputeThreadMessage[] = [
    buildSystemMessage('Dispute opened. Payment is now on hold until resolution.', timestamp),
    {
      id: `message-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      sender: params.openerRole,
      senderAddress: params.openerAddress,
      content: params.comment,
      timestamp,
      type: 'message',
    },
    buildSystemMessage(`Dispute reasons: ${reasonLabel}`, timestamp + 1),
  ];

  return withDisputeCase(order, {
    reasons: params.reasons,
    comment: params.comment,
    evidenceUrls: params.evidenceUrls,
    messages,
    proposals: [],
  });
}

export function appendDisputeMessage(
  order: OrderUiRecord,
  sender: Exclude<DisputeParticipantRole, 'system'>,
  senderAddress: `0x${string}`,
  content: string,
  imageUrls: string[] = [],
): OrderUiRecord {
  const disputeCase = getDisputeCase(order);
  const timestamp = Date.now();
  const nextImageUrls = imageUrls.filter(Boolean);
  return withDisputeCase(order, {
    ...disputeCase,
    evidenceUrls: nextImageUrls.length > 0
      ? Array.from(new Set([...disputeCase.evidenceUrls, ...nextImageUrls]))
      : disputeCase.evidenceUrls,
    messages: [
      ...disputeCase.messages,
      {
        id: `message-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        sender,
        senderAddress,
        content,
        imageUrls: nextImageUrls.length > 0 ? nextImageUrls : undefined,
        timestamp,
        type: 'message',
      },
    ],
  });
}

export function createDisputeProposal(
  order: OrderUiRecord,
  params: {
    outcome: DisputeProposalOutcome;
    buyerShareBps: number;
    sellerShareBps: number;
    proposerRole: Exclude<DisputeParticipantRole, 'system'>;
    proposerAddress: `0x${string}`;
    signature: `0x${string}`;
  },
): OrderUiRecord {
  const disputeCase = getDisputeCase(order);
  const timestamp = Date.now();
  const proposalId = `proposal-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
  const proposal: DisputeProposalRecord = {
    id: proposalId,
    outcome: params.outcome,
    buyerShareBps: params.buyerShareBps,
    sellerShareBps: params.sellerShareBps,
    proposerRole: params.proposerRole,
    proposerAddress: params.proposerAddress,
    createdAt: timestamp,
    status: 'pending',
    signatures: {
      [params.proposerRole]: params.signature,
    },
  };

  return withDisputeCase(order, {
    ...disputeCase,
    proposals: [proposal, ...disputeCase.proposals],
    messages: [
      ...disputeCase.messages,
      {
        id: `proposal-message-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        sender: params.proposerRole,
        senderAddress: params.proposerAddress,
        content: `Proposed ${describeProposal(params.outcome, params.buyerShareBps, params.sellerShareBps)}.`,
        timestamp,
        type: 'proposal',
        proposalId,
      },
    ],
  });
}

export function signDisputeProposal(
  order: OrderUiRecord,
  proposalId: string,
  signerRole: Exclude<DisputeParticipantRole, 'system'>,
  signerAddress: `0x${string}`,
  signature: `0x${string}`,
  options?: {
    status?: DisputeProposalRecord['status'];
    resolvedTxHash?: `0x${string}`;
    resolutionLabel?: string;
  },
): OrderUiRecord {
  const disputeCase = getDisputeCase(order);
  const timestamp = Date.now();
  const proposals = disputeCase.proposals.map((proposal) => {
    if (proposal.id !== proposalId) return proposal;
    const nextSignatures =
      signature !== '0x'
        ? {
            ...proposal.signatures,
            [signerRole]: signature,
          }
        : proposal.signatures;
    return {
      ...proposal,
      status: options?.status ?? proposal.status,
      resolvedTxHash: options?.resolvedTxHash ?? proposal.resolvedTxHash,
      resolvedAt: options?.status === 'resolved' ? timestamp : proposal.resolvedAt,
      signatures: nextSignatures,
    };
  });

  const resolutionMessage = options?.resolutionLabel
    ? [
        buildSystemMessage(
          options.resolutionLabel,
          timestamp,
          proposalId,
        ),
      ]
    : [];

  return withDisputeCase(order, {
    ...disputeCase,
    lastResolutionTxHash: options?.resolvedTxHash ?? disputeCase.lastResolutionTxHash,
    proposals,
    messages: [
      ...disputeCase.messages,
      {
        id: `signature-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        sender: signerRole,
        senderAddress: signerAddress,
        content: `${signerRole} signed proposal ${proposalId.slice(-6)}.`,
        timestamp,
        type: 'system',
        proposalId,
      },
      ...resolutionMessage,
    ],
  });
}

export function rejectDisputeProposal(order: OrderUiRecord, proposalId: string): OrderUiRecord {
  const disputeCase = getDisputeCase(order);
  const timestamp = Date.now();
  return withDisputeCase(order, {
    ...disputeCase,
    proposals: disputeCase.proposals.map((proposal) =>
      proposal.id === proposalId
        ? {
            ...proposal,
            status: 'rejected',
            rejectedAt: timestamp,
          }
        : proposal,
    ),
    messages: [
      ...disputeCase.messages,
      buildSystemMessage(`Proposal ${proposalId.slice(-6)} was rejected.`, timestamp, proposalId),
    ],
  });
}

export function markDisputeExtended(order: OrderUiRecord, txHash?: `0x${string}`): OrderUiRecord {
  const disputeCase = getDisputeCase(order);
  const timestamp = Date.now();
  return withDisputeCase(
    {
      ...order,
      disputeExtended: true,
    },
    {
      ...disputeCase,
      extensionRequestedAt: timestamp,
      extensionTxHash: txHash ?? disputeCase.extensionTxHash,
      messages: [
        ...disputeCase.messages,
        buildSystemMessage('Arbiter extended the dispute by +14 days.', timestamp),
      ],
    },
  );
}

export function countProposalSignatures(proposal: DisputeProposalRecord) {
  return Object.values(proposal.signatures).filter((signature) => signature && signature !== '0x').length;
}

export function describeProposal(
  outcome: DisputeProposalOutcome,
  buyerShareBps: number,
  sellerShareBps: number,
) {
  if (outcome === 'buyer_win') return 'buyer win (full refund)';
  if (outcome === 'seller_win') return 'seller win (full release)';
  return `split ${buyerShareBps / 100}% buyer / ${sellerShareBps / 100}% seller`;
}
