import { X, AlertTriangle, Send, Image as ImageIcon, Clock, Scale, User, Store, ShieldAlert, CheckCircle, XCircle, Plus, ArrowRight } from 'lucide-react';
import { formatEther } from 'viem';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatAddress } from '@/utils/format';

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

interface ChatMessage {
  id: string;
  sender: 'buyer' | 'seller' | 'arbiter';
  senderAddress: `0x${string}`;
  content: string;
  timestamp: number;
  type: 'message' | 'proposal' | 'system';
  proposal?: {
    outcome: 'buyer_win' | 'seller_win' | 'split';
    splitRatio?: number; // Buyer percentage if split
    status: 'pending' | 'accepted' | 'rejected' | 'finalized';
    signatures: {
      buyer: boolean;
      seller: boolean;
      arbiter: boolean;
    };
  };
}

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    sender: 'arbiter',
    senderAddress: '0x0000000000000000000000000000000000000001' as `0x${string}`,
    content: 'Dispute case opened. I will review the evidence from both parties and facilitate a resolution. Please provide any additional information that may help resolve this matter.',
    timestamp: Date.now() - 3600 * 12 * 1000,
    type: 'system',
  },
  {
    id: '2',
    sender: 'buyer',
    senderAddress: '0x8aC7fe5b2c5d9f8e32a1' as `0x${string}`,
    content: 'The watch received is not in the condition described. The crystal has scratches that were not mentioned in the listing.',
    timestamp: Date.now() - 3600 * 11.5 * 1000,
    type: 'message',
  },
  {
    id: '3',
    sender: 'seller',
    senderAddress: '0x6Bf9a7c2e4d1f92b' as `0x${string}`,
    content: 'All conditions were clearly stated in the description. The watch was shipped in the exact condition as photographed. These are normal wear marks for a vintage piece.',
    timestamp: Date.now() - 3600 * 11 * 1000,
    type: 'message',
  },
  {
    id: '4',
    sender: 'seller',
    senderAddress: '0x6Bf9a7c2e4d1f92b' as `0x${string}`,
    content: 'I propose a 70/30 split - 70% to seller, 30% refund to buyer as a goodwill gesture.',
    timestamp: Date.now() - 3600 * 10 * 1000,
    type: 'proposal',
    proposal: {
      outcome: 'split',
      splitRatio: 30, // Buyer gets 30%
      status: 'pending',
      signatures: {
        buyer: false,
        seller: false,
        arbiter: false,
      },
    },
  },
];

const ARBITER_ADDRESS = '0x0000000000000000000000000000000000000001' as `0x${string}`;

export function DisputeResolutionModal({ order, currentUser, userRole, onClose }: DisputeResolutionModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalType, setProposalType] = useState<'buyer_win' | 'seller_win' | 'split'>('split');
  const [splitRatio, setSplitRatio] = useState(50);
  const [showExtendRequest, setShowExtendRequest] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Calculate time remaining
  const [timeRemaining, setTimeRemaining] = useState('');
  useEffect(() => {
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const deadline = Number(order.disputeDeadline);
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining('EXPIRED - Auto Split 50/50');
        return;
      }

      const days = Math.floor(diff / (24 * 3600));
      const hours = Math.floor((diff % (24 * 3600)) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);

      setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [order.disputeDeadline]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: userRole,
      senderAddress: currentUser,
      content: newMessage,
      timestamp: Date.now(),
      type: 'message',
    };

    setMessages([...messages, message]);
    setNewMessage('');
  };

  const handleSendProposal = () => {
    const message: ChatMessage = {
      id: Date.now().toString(),
      sender: userRole,
      senderAddress: currentUser,
      content: `Proposed settlement: ${
        proposalType === 'buyer_win' 
          ? 'Full refund to buyer'
          : proposalType === 'seller_win'
          ? 'Full payment to seller'
          : `Split ${100 - splitRatio}/${splitRatio} (Seller/Buyer)`
      }`,
      timestamp: Date.now(),
      type: 'proposal',
      proposal: {
        outcome: proposalType,
        splitRatio: proposalType === 'split' ? splitRatio : undefined,
        status: 'pending',
        signatures: {
          buyer: false,
          seller: false,
          arbiter: false,
        },
      },
    };

    setMessages([...messages, message]);
    setShowProposalForm(false);
    setSplitRatio(50);
  };

  const handleSignProposal = (messageId: string) => {
    setMessages(prevMessages => {
      return prevMessages.map(msg => {
        if (msg.id === messageId && msg.proposal) {
          // Update signature for current user role
          const newSignatures = {
            ...msg.proposal.signatures,
            [userRole]: true,
          };
          
          // Count signatures
          const signCount = Object.values(newSignatures).filter(Boolean).length;
          
          // Check if 2/3 threshold reached
          if (signCount >= 2) {
            // Finalize proposal
            setTimeout(() => {
              const systemMsg: ChatMessage = {
                id: Date.now().toString(),
                sender: 'arbiter',
                senderAddress: ARBITER_ADDRESS,
                content: `✅ Settlement finalized! ${signCount}/3 signatures received. Executing transaction...`,
                timestamp: Date.now(),
                type: 'system',
              };
              setMessages(prev => [...prev, systemMsg]);
            }, 500);
            
            return {
              ...msg,
              proposal: {
                ...msg.proposal,
                signatures: newSignatures,
                status: 'finalized' as const,
              },
            };
          }
          
          return {
            ...msg,
            proposal: {
              ...msg.proposal,
              signatures: newSignatures,
            },
          };
        }
        return msg;
      });
    });
  };

  const handleRejectProposal = (messageId: string) => {
    setMessages(messages.map(msg => {
      if (msg.id === messageId && msg.proposal) {
        return {
          ...msg,
          proposal: { ...msg.proposal, status: 'rejected' as const }
        };
      }
      return msg;
    }));
  };

  const handleExtendDispute = () => {
    const systemMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'arbiter',
      senderAddress: ARBITER_ADDRESS,
      content: '⏰ Extension request submitted. Dispute deadline will be extended by 14 days if both parties agree.',
      timestamp: Date.now(),
      type: 'system',
    };
    setMessages([...messages, systemMsg]);
    setShowExtendRequest(false);
  };

  const getRoleColor = (role: 'buyer' | 'seller' | 'arbiter') => {
    switch (role) {
      case 'buyer':
        return 'blue';
      case 'seller':
        return 'purple';
      case 'arbiter':
        return 'orange';
    }
  };

  const getRoleIcon = (role: 'buyer' | 'seller' | 'arbiter') => {
    switch (role) {
      case 'buyer':
        return <User size={14} />;
      case 'seller':
        return <Store size={14} />;
      case 'arbiter':
        return <ShieldAlert size={14} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0f0f11] border border-[#27272a] rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#27272a] bg-zinc-900/30 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <Scale className="text-orange-500" size={24} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-white font-bold text-sm uppercase tracking-wider">Dispute Resolution</h2>
                  <span className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg text-[9px] font-bold text-orange-400 uppercase tracking-widest">
                    Case #{order.orderId.toString().slice(-6)}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">
                  Negotiation period: {timeRemaining}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#27272a] bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
            >
              <X size={18} className="text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Panel - Chat */}
          <div className="flex-1 flex flex-col border-r border-[#27272a] min-h-0">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {messages.map((message) => {
                const isCurrentUser = message.senderAddress.toLowerCase() === currentUser.toLowerCase();
                const roleColor = getRoleColor(message.sender);
                
                if (message.type === 'system') {
                  return (
                    <div key={message.id} className="flex justify-center">
                      <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-xs text-orange-300 max-w-2xl text-center">
                        {message.content}
                      </div>
                    </div>
                  );
                }

                if (message.type === 'proposal' && message.proposal) {
                  const signCount = Object.values(message.proposal.signatures).filter(Boolean).length;
                  const hasUserSigned = message.proposal.signatures[userRole];
                  
                  return (
                    <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-2xl w-full ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                        {/* Sender Info */}
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full bg-${roleColor}-500/20 flex items-center justify-center`}>
                            <div className={`text-${roleColor}-400`}>
                              {getRoleIcon(message.sender)}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-zinc-400 uppercase">
                            {message.sender}
                          </span>
                          <span className="text-xs text-zinc-600 font-mono">
                            {formatAddress(message.senderAddress)}
                          </span>
                        </div>

                        {/* Proposal Card */}
                        <div className={`w-full p-5 rounded-xl border-2 ${
                          message.proposal.status === 'finalized'
                            ? 'bg-[#2CC295]/10 border-[#2CC295]/30'
                            : message.proposal.status === 'rejected'
                            ? 'bg-red-500/10 border-red-500/30'
                            : 'bg-zinc-900/50 border-orange-500/30'
                        }`}>
                          <div className="flex items-start gap-3 mb-4">
                            <Scale className="text-orange-500 shrink-0" size={20} />
                            <div className="flex-1">
                              <p className="text-sm font-bold text-white mb-1">Settlement Proposal</p>
                              <p className="text-xs text-zinc-400">{message.content}</p>
                            </div>
                          </div>

                          {/* Breakdown */}
                          {message.proposal.outcome === 'split' && message.proposal.splitRatio && (
                            <div className="space-y-2 mb-4 p-3 bg-zinc-800/50 rounded-lg border border-[#27272a]">
                              <div className="flex justify-between text-xs">
                                <span className="text-zinc-400">Seller receives:</span>
                                <span className="font-bold text-white">
                                  {formatEther(order.grossPrice * BigInt(100 - message.proposal.splitRatio) / BigInt(100))} ETH
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-zinc-400">Buyer refund:</span>
                                <span className="font-bold text-white">
                                  {formatEther(order.grossPrice * BigInt(message.proposal.splitRatio) / BigInt(100))} ETH
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Multi-Sig Signatures */}
                          {message.proposal.status !== 'rejected' && (
                            <div className="mb-4 p-4 bg-zinc-800/50 rounded-lg border border-[#27272a]">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                  Signatures ({signCount}/3) - 2 Required
                                </p>
                                {message.proposal.status === 'finalized' && (
                                  <CheckCircle className="text-[#2CC295]" size={16} />
                                )}
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2">
                                {/* Buyer Signature */}
                                <div className={`p-2.5 rounded-lg border transition-all ${
                                  message.proposal.signatures.buyer
                                    ? 'bg-blue-500/20 border-blue-500/50'
                                    : 'bg-zinc-900 border-[#27272a]'
                                }`}>
                                  <div className="flex flex-col items-center gap-1.5">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      message.proposal.signatures.buyer
                                        ? 'bg-blue-500'
                                        : 'bg-zinc-800 border border-[#27272a]'
                                    }`}>
                                      {message.proposal.signatures.buyer ? (
                                        <CheckCircle className="text-black" size={16} />
                                      ) : (
                                        <User className="text-zinc-600" size={14} />
                                      )}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase ${
                                      message.proposal.signatures.buyer
                                        ? 'text-blue-400'
                                        : 'text-zinc-600'
                                    }`}>
                                      Buyer
                                    </span>
                                  </div>
                                </div>

                                {/* Seller Signature */}
                                <div className={`p-2.5 rounded-lg border transition-all ${
                                  message.proposal.signatures.seller
                                    ? 'bg-purple-500/20 border-purple-500/50'
                                    : 'bg-zinc-900 border-[#27272a]'
                                }`}>
                                  <div className="flex flex-col items-center gap-1.5">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      message.proposal.signatures.seller
                                        ? 'bg-purple-500'
                                        : 'bg-zinc-800 border border-[#27272a]'
                                    }`}>
                                      {message.proposal.signatures.seller ? (
                                        <CheckCircle className="text-black" size={16} />
                                      ) : (
                                        <Store className="text-zinc-600" size={14} />
                                      )}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase ${
                                      message.proposal.signatures.seller
                                        ? 'text-purple-400'
                                        : 'text-zinc-600'
                                    }`}>
                                      Seller
                                    </span>
                                  </div>
                                </div>

                                {/* Arbiter Signature */}
                                <div className={`p-2.5 rounded-lg border transition-all ${
                                  message.proposal.signatures.arbiter
                                    ? 'bg-orange-500/20 border-orange-500/50'
                                    : 'bg-zinc-900 border-[#27272a]'
                                }`}>
                                  <div className="flex flex-col items-center gap-1.5">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                      message.proposal.signatures.arbiter
                                        ? 'bg-orange-500'
                                        : 'bg-zinc-800 border border-[#27272a]'
                                    }`}>
                                      {message.proposal.signatures.arbiter ? (
                                        <CheckCircle className="text-black" size={16} />
                                      ) : (
                                        <ShieldAlert className="text-zinc-600" size={14} />
                                      )}
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase ${
                                      message.proposal.signatures.arbiter
                                        ? 'text-orange-400'
                                        : 'text-zinc-600'
                                    }`}>
                                      Arbiter
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          {message.proposal.status === 'pending' && !hasUserSigned && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRejectProposal(message.id)}
                                className="flex-1 py-2.5 bg-zinc-800 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-500/10 transition-all"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleSignProposal(message.id)}
                                className="flex-1 py-2.5 bg-[#2CC295] text-black rounded-lg text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
                              >
                                <CheckCircle size={14} />
                                Sign Proposal
                              </button>
                            </div>
                          )}

                          {/* Waiting Badge */}
                          {message.proposal.status === 'pending' && hasUserSigned && (
                            <div className="flex items-center gap-2 justify-center py-2.5 rounded-lg bg-zinc-800/50 border border-[#27272a]">
                              <Clock size={14} className="text-zinc-500" />
                              <span className="text-xs font-bold text-zinc-500">
                                Waiting for {3 - signCount} more signature{3 - signCount > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}

                          {/* Status Badge */}
                          {message.proposal.status === 'finalized' && (
                            <div className="flex items-center gap-2 justify-center py-2.5 rounded-lg bg-[#2CC295]/20 text-[#2CC295]">
                              <CheckCircle size={14} />
                              <span className="text-xs font-bold">Settlement Finalized - Executing...</span>
                            </div>
                          )}

                          {message.proposal.status === 'rejected' && (
                            <div className="flex items-center gap-2 justify-center py-2.5 rounded-lg bg-red-500/20 text-red-400">
                              <XCircle size={14} />
                              <span className="text-xs font-bold">Proposal Rejected</span>
                            </div>
                          )}
                        </div>

                        <span className="text-xs text-zinc-600 font-mono">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xl ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {/* Sender Info */}
                      {!isCurrentUser && (
                        <div className="flex items-center gap-2 px-2">
                          <div className={`w-5 h-5 rounded-full bg-${roleColor}-500/20 flex items-center justify-center`}>
                            <div className={`text-${roleColor}-400`} style={{ fontSize: '10px' }}>
                              {getRoleIcon(message.sender)}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-zinc-400 uppercase">
                            {message.sender}
                          </span>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div className={`px-4 py-3 rounded-xl ${
                        isCurrentUser
                          ? 'bg-[#2CC295] text-black'
                          : 'bg-zinc-800 text-white border border-[#27272a]'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                      </div>

                      <span className="text-xs text-zinc-600 font-mono px-2">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Proposal Form */}
            <AnimatePresence>
              {showProposalForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-[#27272a] bg-zinc-900/50 overflow-hidden"
                >
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-white">Create Settlement Proposal</p>
                      <button
                        onClick={() => setShowProposalForm(false)}
                        className="text-zinc-500 hover:text-zinc-300"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Proposal Type */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setProposalType('buyer_win')}
                        className={`p-3 rounded-lg border text-xs font-bold transition-all ${
                          proposalType === 'buyer_win'
                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                            : 'bg-zinc-800 border-[#27272a] text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        Buyer Win<br />
                        <span className="text-[10px] opacity-70">Full Refund</span>
                      </button>
                      <button
                        onClick={() => setProposalType('seller_win')}
                        className={`p-3 rounded-lg border text-xs font-bold transition-all ${
                          proposalType === 'seller_win'
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                            : 'bg-zinc-800 border-[#27272a] text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        Seller Win<br />
                        <span className="text-[10px] opacity-70">Full Payment</span>
                      </button>
                      <button
                        onClick={() => setProposalType('split')}
                        className={`p-3 rounded-lg border text-xs font-bold transition-all ${
                          proposalType === 'split'
                            ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                            : 'bg-zinc-800 border-[#27272a] text-zinc-400 hover:border-zinc-600'
                        }`}
                      >
                        Split<br />
                        <span className="text-[10px] opacity-70">Custom Ratio</span>
                      </button>
                    </div>

                    {/* Split Ratio Slider */}
                    {proposalType === 'split' && (
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-400">Buyer Refund:</span>
                          <span className="font-bold text-white">{splitRatio}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={splitRatio}
                          onChange={(e) => setSplitRatio(parseInt(e.target.value))}
                          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500"
                        />
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>Seller: {100 - splitRatio}%</span>
                          <span>Buyer: {splitRatio}%</span>
                        </div>
                        {/* Preview */}
                        <div className="p-3 bg-zinc-800/50 rounded-lg border border-[#27272a] space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-400">Seller receives:</span>
                            <span className="font-bold text-white">
                              {formatEther(order.grossPrice * BigInt(100 - splitRatio) / BigInt(100))} ETH
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-400">Buyer refund:</span>
                            <span className="font-bold text-white">
                              {formatEther(order.grossPrice * BigInt(splitRatio) / BigInt(100))} ETH
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Send Proposal Button */}
                    <button
                      onClick={handleSendProposal}
                      className="w-full py-3 bg-orange-500 text-black rounded-lg font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                    >
                      <Scale size={16} />
                      Send Proposal
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Input */}
            <div className="p-4 border-t border-[#27272a] shrink-0 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 bg-zinc-900 border border-[#27272a] rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-[#2CC295]/20 focus:border-[#2CC295]"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="px-5 py-3 bg-[#2CC295] text-black rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                </button>
              </div>
              <button
                onClick={() => setShowProposalForm(!showProposalForm)}
                className="w-full py-2.5 bg-orange-500/10 border border-orange-500/30 text-orange-500 rounded-lg text-xs font-bold hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Scale size={14} />
                Propose Settlement
              </button>
            </div>
          </div>

          {/* Right Panel - Evidence & Info */}
          <div className="w-96 flex flex-col overflow-hidden bg-zinc-900/30 min-h-0">
            {/* Timeline - Top Fixed */}
            <div className="p-4 border-b border-[#27272a] shrink-0">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Timeline</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-zinc-900/50 border border-[#27272a] rounded-lg">
                  <Clock className="text-orange-500 shrink-0" size={14} />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-white">Time Remaining</p>
                    <p className="text-[10px] text-zinc-400">{timeRemaining}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExtendRequest(true)}
                  className="w-full py-1.5 bg-zinc-800 border border-[#27272a] text-zinc-300 rounded-lg text-[10px] font-bold hover:bg-zinc-700 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus size={12} />
                  Request +14 Days Extension
                </button>
              </div>
            </div>

            {/* Order Info - Fixed */}
            <div className="p-4 border-b border-[#27272a] shrink-0">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Order Details</p>
              <div className="flex items-center gap-2 p-2 bg-zinc-900/50 border border-[#27272a] rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-[#27272a] overflow-hidden shrink-0">
                  <img
                    alt="Product"
                    className="w-full h-full object-cover"
                    src={order.assetImage}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{order.assetName}</p>
                  <p className="text-[10px] text-zinc-500">
                    Qty: {order.amount.toString()} • {formatEther(order.grossPrice)} ETH
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Section - Participants + Evidence */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
              {/* Participants */}
              <div className="p-4 border-b border-[#27272a]">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Participants</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User className="text-blue-400" size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-blue-400 uppercase">Buyer</p>
                      <p className="text-[10px] text-zinc-400 font-mono truncate">{formatAddress(order.buyer)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <Store className="text-purple-400" size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-purple-400 uppercase">Seller</p>
                      <p className="text-[10px] text-zinc-400 font-mono truncate">{formatAddress(order.seller)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <ShieldAlert className="text-orange-400" size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-orange-400 uppercase">Arbiter</p>
                      <p className="text-[10px] text-zinc-400 font-mono truncate">{formatAddress(ARBITER_ADDRESS)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reasons */}
              <div className="p-4 border-b border-[#27272a]">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Dispute Reasons</p>
                <div className="space-y-1.5">
                  {order.disputeReason.map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 p-1.5 bg-zinc-900/50 border border-[#27272a] rounded-lg">
                      <AlertTriangle className="text-orange-500 shrink-0" size={12} />
                      <span className="text-[10px] text-zinc-300">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="p-4 border-b border-[#27272a]">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Description</p>
                <div className="p-2 bg-zinc-900/50 border border-[#27272a] rounded-lg">
                  <p className="text-[10px] text-zinc-300 leading-relaxed">{order.disputeComment}</p>
                </div>
              </div>

              {/* Evidence */}
              {order.disputeEvidence.length > 0 && (
                <div className="p-4 border-b border-[#27272a]">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Evidence</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {order.disputeEvidence.map((url, idx) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-zinc-800 border border-[#27272a] cursor-pointer hover:border-[#2CC295] transition-colors">
                        <img
                          src={url}
                          alt={`Evidence ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto Resolution Notice */}
              <div className="p-4">
                <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
                  <div className="flex gap-2">
                    <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={12} />
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider">
                        Auto-Resolution
                      </p>
                      <p className="text-[10px] text-zinc-400 leading-relaxed">
                        If no settlement is reached within the deadline, the system will automatically split funds 50/50 between buyer and seller.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Extend Request Confirmation */}
      <AnimatePresence>
        {showExtendRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-10"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-[#1a1a1c] border border-[#27272a] rounded-xl p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                  <Clock className="text-yellow-500" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Request Extension</h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    This will extend the dispute deadline by 14 additional days. Both parties must agree.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExtendRequest(false)}
                  className="flex-1 py-3 bg-zinc-800 text-zinc-300 border border-[#27272a] rounded-lg font-bold text-sm hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExtendDispute}
                  className="flex-1 py-3 bg-orange-500 text-black rounded-lg font-bold text-sm hover:opacity-90 transition-all"
                >
                  Request Extension
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}