import { useState, useEffect, useRef } from 'react';
import { Bot, Send, CheckCircle, XCircle, Settings as SettingsIcon, Sparkles, ArrowDown } from 'lucide-react';
import { AIConversationMessage } from '@/app/types/ai-agent';
import { AIAgentClient } from '@/utils/aiAgentClient';
import { StudioLoadingIndicator } from '@/app/components/ui/studio-loading-indicator';
import { StudioTypingIndicator } from '@/app/components/ui/studio-typing-indicator';

interface AIAgentTestProps {
  sellerAddress: string;
}

export function AIAgentTest({ sellerAddress }: AIAgentTestProps) {
  const [messages, setMessages] = useState<AIConversationMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [agentEnabled, setAgentEnabled] = useState<boolean | null>(null);
  const [agentName, setAgentName] = useState('AI Assistant');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const conversationId = `test_conv_${sellerAddress}`;

  useEffect(() => {
    checkAgentStatus();
    loadConversationHistory();
  }, [sellerAddress]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAgentStatus = async () => {
    const config = await AIAgentClient.getConfig(sellerAddress);
    if (config) {
      setAgentEnabled(config.enabled);
      setAgentName(config.name);
    } else {
      // No config found - create default enabled config for testing
      console.log('No AI Agent config found, creating default...');
      const defaultConfig = {
        walletAddress: sellerAddress,
        name: 'Sales Assistant',
        behavior: 'moderate',
        enabled: true,
        autoReplyEnabled: true
      };
      
      const saved = await AIAgentClient.saveConfig(defaultConfig);
      if (saved) {
        console.log('Default AI Agent config created successfully');
        setAgentEnabled(true);
        setAgentName('Sales Assistant');
      } else {
        console.error('Failed to create default AI Agent config');
        setAgentEnabled(false);
      }
    }
  };

  const loadConversationHistory = async () => {
    const history = await AIAgentClient.getConversationHistory(conversationId);
    setMessages(history);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || sending) return;

    const userMessage: AIConversationMessage = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId: 'customer_test',
      senderType: 'customer',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSending(true);

    try {
      const aiResponse = await AIAgentClient.sendMessage(
        sellerAddress,
        inputMessage.trim(),
        conversationId
      );

      if (aiResponse) {
        setMessages(prev => [...prev, aiResponse]);
      } else {
        // Error response
        const errorMsg: AIConversationMessage = {
          id: `msg_error_${Date.now()}`,
          conversationId,
          senderId: 'system',
          senderType: 'ai_agent',
          content: '❌ AI Agent is not responding. Please check if it\'s enabled in Settings.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    "Hi, what do you sell?",
    "How much does it cost?",
    "Can I pay with crypto?",
    "What are your shipping options?",
    "I want to buy something"
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121212]/50">
      {/* Chat Header */}
      <div className="p-5 border-b border-[#27272a] flex items-center justify-between bg-[#121212]/80 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2CC295] to-[#1a9d6f] border border-[#27272a] overflow-hidden flex items-center justify-center">
            <Bot className="text-white" size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {agentName}
              <span className="text-[9px] bg-[#2CC295]/10 text-[#2CC295] border border-[#2CC295]/20 px-2 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                <Bot size={10} />
                AI Agent Test
              </span>
            </h3>
            <div className="flex items-center gap-1.5">
              {agentEnabled === null ? (
                <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                  <StudioLoadingIndicator
                    layout="inline"
                    tone="inherit"
                    size={10}
                    label="Checking..."
                    className="text-zinc-500"
                    labelClassName="uppercase font-bold tracking-widest text-current"
                  />
                </span>
              ) : agentEnabled ? (
                <>
                  <span className="w-1.5 h-1.5 bg-[#2CC295] rounded-full"></span>
                  <span className="text-[10px] text-[#2CC295] uppercase font-bold tracking-widest">Online</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                  <span className="text-[10px] text-red-400 uppercase font-bold tracking-widest">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 bg-[rgba(255,255,255,0.02)] border-0 rounded-lg text-[10px] text-zinc-400 hover:text-white hover:border-[#2CC295]/30 transition-colors uppercase font-bold tracking-wider"
            onClick={() => {
              setMessages([]);
            }}
          >
            Clear Chat
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-6 space-y-6 hidden-scrollbar min-h-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        ref={messagesContainerRef}
        onScroll={(e) => {
          const currentRef = e.currentTarget;
          if (currentRef.scrollTop + currentRef.clientHeight < currentRef.scrollHeight - 100) {
            setShowScrollButton(true);
          } else {
            setShowScrollButton(false);
          }
        }}
      >
        {/* Date Divider - Show when there are messages */}
        {messages.length > 0 && (
          <div className="flex justify-center">
            <span className="text-[10px] px-3 py-1 bg-[rgba(255,255,255,0.02)] border-0 rounded-full text-zinc-500 uppercase tracking-widest font-bold">
              Today
            </span>
          </div>
        )}

        {/* Welcome Message */}
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-[#2CC295]/20 to-[#1a9d6f]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="text-[#2CC295]" size={28} />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Test Your AI Agent</h3>
            <p className="text-zinc-500 text-sm max-w-md mx-auto mb-6">
              Start a conversation to see how your AI Agent responds to customer inquiries.
              {!agentEnabled && ' Please enable AI Agent in Settings first.'}
            </p>
            
            {/* Quick Questions */}
            {agentEnabled && (
              <div className="max-w-2xl mx-auto">
                <p className="text-xs text-zinc-400 uppercase font-bold mb-3">Try asking:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInputMessage(question);
                        setTimeout(() => handleSendMessage(), 100);
                      }}
                      className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-[#27272a] hover:border-[#2CC295]/30 text-zinc-300 px-3 py-2 rounded-lg transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          msg.senderType !== 'customer' ? (
            // AI Agent Message (Left)
            <div key={msg.id} className="flex items-end gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2CC295] to-[#1a9d6f] overflow-hidden flex-shrink-0 self-end">
                <Bot className="w-full h-full text-white p-1.5" />
              </div>
              <div>
                <div className="bg-white/[0.05] backdrop-blur-lg border border-white/10 p-4 rounded-2xl rounded-bl-none">
                  <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 px-1">
                  <span className="text-[10px] text-zinc-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {msg.metadata?.confidence && (
                    <span className="text-[10px] text-zinc-600">
                      • Confidence: {Math.round(msg.metadata.confidence * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // User Message (Right)
            <div key={msg.id} className="flex flex-row-reverse items-end gap-3 max-w-[80%] ml-auto">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 overflow-hidden flex-shrink-0 self-end flex items-center justify-center">
                <span className="text-sm">😊</span>
              </div>
              <div>
                <div className="bg-[#2CC295]/15 backdrop-blur-lg border border-[#2CC295]/20 p-4 rounded-2xl rounded-br-none">
                  <p className="text-xs text-white leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                <div className="flex items-center justify-end gap-1 mt-1.5 px-1">
                  <span className="text-[10px] text-[#2CC295]/70">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <svg className="w-3.5 h-3.5 text-[#2CC295]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13l4 4L23 7" />
                  </svg>
                </div>
              </div>
            </div>
          )
        ))}

        {/* Typing Indicator */}
        {sending && (
          <div className="flex items-end gap-3 max-w-[80%]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2CC295] to-[#1a9d6f] overflow-hidden flex-shrink-0 self-end">
              <Bot className="w-full h-full text-white p-1.5" />
            </div>
            <div className="bg-white/[0.05] backdrop-blur-lg border border-white/10 p-4 rounded-2xl rounded-bl-none">
              <StudioTypingIndicator tone="muted" dotSize={8} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-[#27272a] bg-[#121212]/80 backdrop-blur-md">
        {!agentEnabled && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3 flex items-center gap-2">
            <SettingsIcon className="text-yellow-400 shrink-0" size={16} />
            <p className="text-xs text-yellow-200">
              AI Agent is disabled. Go to <strong>Settings → AI Agent</strong> to enable it.
            </p>
          </div>
        )}
        
        <div className="flex items-center gap-4 max-w-4xl mx-auto w-full">
          <div className="flex-grow relative">
            <input
              className="w-full bg-zinc-900 border-[#27272a] rounded-xl px-4 py-3 pr-12 text-sm text-white focus:ring-[#2CC295] focus:border-[#2CC295] placeholder-zinc-600"
              placeholder="Type a secure message..."
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
            />
          </div>
          <button
            className="w-11 h-11 bg-[#2CC295] text-black rounded-full flex items-center justify-center hover:shadow-lg hover:shadow-[#2CC295]/20 hover:scale-105 transition-all flex-shrink-0"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || sending}
          >
            {sending ? (
              <StudioLoadingIndicator layout="inline" tone="inherit" size={18} />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
