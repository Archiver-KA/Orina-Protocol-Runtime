import { useState } from 'react';
import { Bell, Mail, MessageSquare, Package, Settings as SettingsIcon, CheckCircle, AlertTriangle, XCircle, Palette, TestTube, LayoutGrid } from 'lucide-react';
import { NotificationBadge } from './notification-badge';
import { Toast, ToastContainer, ToastProps, ToastType } from './toast';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationType } from '@/types/notifications';
import { CardLayoutTab } from './card-layout-tab';

type TabType = 'showcase' | 'testing' | 'cards';

export function NotificationDemo() {
  const [activeTab, setActiveTab] = useState<TabType>('showcase');
  const { addNotification, notifications, unreadCount } = useNotifications();
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [selectedType, setSelectedType] = useState<NotificationType>('order');

  const addToast = (type: ToastType, title: string, message: string) => {
    const id = `toast_${Date.now()}`;
    const newToast: ToastProps = {
      id,
      type,
      title,
      message,
      duration: 5000,
      onClose: () => {
        setToasts(prev => prev.filter(t => t.id !== id));
      },
    };
    setToasts(prev => [...prev, newToast]);
  };

  const handleAddDemoNotifications = () => {
    addNotification('order', 'New Order #A1B2C', 'Order payment received for luxury apartment asset.');
    addNotification('message', 'Message from 0x71C...4f2', 'Are you interested in the RWA property?');
    addNotification('system', 'Network Update', 'Please switch to Sepolia testnet to continue.');
    addNotification('order', 'Order Confirmed', 'Your order has been confirmed and is being processed.');
    addNotification('message', 'New Reply', 'Someone replied to your comment in the community.');
  };

  const demoNotifications = [
    {
      type: 'order' as NotificationType,
      title: 'Order Payment Received',
      message: 'Payment of 1.5 ETH received for Order #12345. The order is now in escrow.',
      metadata: { orderId: '12345', amount: '1.5 ETH' },
    },
    {
      type: 'order' as NotificationType,
      title: 'Order Released',
      message: 'Payment for Order #12340 has been released to the seller. Transaction complete!',
      metadata: { orderId: '12340' },
    },
    {
      type: 'message' as NotificationType,
      title: 'New Message from 0x8a1...2f3',
      message: 'Hey! Are you still interested in the RWA property asset?',
      metadata: { fromAddress: '0x8a1...2f3' },
    },
    {
      type: 'system' as NotificationType,
      title: 'Network Switch Required',
      message: 'Please switch to Sepolia testnet to continue using the marketplace.',
    },
    {
      type: 'success' as NotificationType,
      title: 'Asset Minted Successfully',
      message: 'Your RWA asset "Luxury Apartment #442" has been minted successfully!',
      metadata: { assetId: '442' },
    },
    {
      type: 'warning' as NotificationType,
      title: 'Payment Deadline Approaching',
      message: 'Order #12350 payment is due in 2 hours. Please complete payment to avoid cancellation.',
      metadata: { orderId: '12350' },
    },
    {
      type: 'error' as NotificationType,
      title: 'Transaction Failed',
      message: 'Your transaction was rejected. Please check your wallet and try again.',
    },
  ];

  const handleAddDemo = (demo: typeof demoNotifications[0]) => {
    addNotification(demo.type, demo.title, demo.message, demo.metadata);
  };

  const handleAddCustom = () => {
    if (!customTitle.trim() || !customMessage.trim()) {
      alert('Please enter both title and message');
      return;
    }
    addNotification(selectedType, customTitle, customMessage);
    setCustomTitle('');
    setCustomMessage('');
  };

  const typeOptions: { value: NotificationType; label: string; icon: JSX.Element; color: string }[] = [
    { value: 'order', label: 'Order', icon: <Package size={16} />, color: 'text-orange-400' },
    { value: 'message', label: 'Message', icon: <MessageSquare size={16} />, color: 'text-[#2CC295]' },
    { value: 'system', label: 'System', icon: <SettingsIcon size={16} />, color: 'text-zinc-400' },
    { value: 'success', label: 'Success', icon: <CheckCircle size={16} />, color: 'text-green-400' },
    { value: 'warning', label: 'Warning', icon: <AlertTriangle size={16} />, color: 'text-amber-400' },
    { value: 'error', label: 'Error', icon: <XCircle size={16} />, color: 'text-red-400' },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f11] text-zinc-300 overflow-y-auto custom-scrollbar">
      <style>{`
        .ambient-blob {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(44, 194, 149, 0.03) 0%, rgba(18, 18, 18, 0) 70%);
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          pointer-events: none;
        }
      `}</style>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} position="top-right" />

      <div className="max-w-7xl mx-auto p-8 lg:p-12">
        <div className="ambient-blob -top-40 -left-40"></div>

        <div className="relative z-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-2 flex items-center gap-3">
              <Bell className="text-[#2CC295]" />
              Notifications & Badges
            </h1>
            <p className="text-zinc-500 text-base lg:text-lg">
              Web3 technical UI Kit - Communication and Alerts system.
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-8 border-b border-[#27272a]">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('showcase')}
                className={`
                  flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all relative
                  ${activeTab === 'showcase'
                    ? 'text-[#2CC295]'
                    : 'text-zinc-400 hover:text-zinc-300'
                  }
                `}
              >
                <Palette size={18} />
                UI Showcase
                {activeTab === 'showcase' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2CC295] shadow-[0_0_12px_rgba(44,194,149,0.6)]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('testing')}
                className={`
                  flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all relative
                  ${activeTab === 'testing'
                    ? 'text-[#2CC295]'
                    : 'text-zinc-400 hover:text-zinc-300'
                  }
                `}
              >
                <TestTube size={18} />
                Testing Lab
                {activeTab === 'testing' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2CC295] shadow-[0_0_12px_rgba(44,194,149,0.6)]" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('cards')}
                className={`
                  flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all relative
                  ${activeTab === 'cards'
                    ? 'text-[#2CC295]'
                    : 'text-zinc-400 hover:text-zinc-300'
                  }
                `}
              >
                <LayoutGrid size={18} />
                Card Layout
                {activeTab === 'cards' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2CC295] shadow-[0_0_12px_rgba(44,194,149,0.6)]" />
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'showcase' ? (
            /* UI SHOWCASE TAB */
            <div className="space-y-20">
              {/* Badge Variations */}
              <section>
                <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                      Badge Variations
                    </h3>
                    <p className="text-xs text-zinc-600 mt-2">
                      Scalable notification counters with overflow support.
                    </p>
                  </div>

                  <div className="space-y-12">
                    {/* Labels */}
                    <div className="grid grid-cols-3 gap-8 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                      <span>Small (16px)</span>
                      <span>Medium (20px)</span>
                      <span>Large (24px)</span>
                    </div>

                    {/* Badges */}
                    <div className="grid grid-cols-3 gap-8 items-end">
                      <div className="flex items-center gap-4">
                        <NotificationBadge count={5} size="sm" />
                        <span className="text-[10px] text-zinc-500 font-mono">0.5rem</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <NotificationBadge count={24} size="md" />
                        <span className="text-[10px] text-zinc-500 font-mono">1.25rem</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <NotificationBadge count={150} max={99} size="lg" />
                        <span className="text-[10px] text-zinc-500 font-mono">1.5rem</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Contextual Usage */}
              <section>
                <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                      Contextual Usage
                    </h3>
                  </div>

                  <div className="flex flex-col md:flex-row gap-8 md:gap-16">
                    {/* Icon Integration */}
                    <div className="flex flex-col gap-4">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                        Icon integration
                      </span>
                      <div className="relative w-fit">
                        <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.02)] border-0 flex items-center justify-center">
                          <Bell size={24} className="text-zinc-400" />
                        </div>
                        <div className="absolute -top-1.5 -right-1.5">
                          <NotificationBadge 
                            count={3} 
                            size="md" 
                            className="border-2 border-[#121212]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Navigation List */}
                    <div className="flex flex-col gap-4 flex-1">
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                        Navigation list
                      </span>
                      <div className="max-w-[240px] bg-[rgba(255,255,255,0.02)] border-0 rounded-lg p-2">
                        <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-md">
                          <div className="flex items-center gap-3">
                            <Mail size={20} className="text-zinc-400" />
                            <span className="text-sm font-medium text-white">Messages</span>
                          </div>
                          <NotificationBadge count={12} size="sm" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* System Alerts */}
              <section>
                <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                      System Alerts
                    </h3>
                    <p className="text-xs text-zinc-600 mt-2">
                      'Sonner' style toasts for technical feedback.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Static Toast Examples */}
                    <Toast
                      type="success"
                      title="Transaction Confirmed"
                      message="Wallet 0x71...4f2 successfully swapped 1.5 ETH to USDC."
                    />

                    <Toast
                      type="error"
                      title="Execution Reverted"
                      message="Insufficient gas for the requested transaction. Please check your balance."
                    />

                    <Toast
                      type="warning"
                      title="Slippage Warning"
                      message="High price impact detected. Transaction may be frontrun."
                    />

                    {/* Action Buttons */}
                    <div className="mt-8 flex gap-3 flex-wrap">
                      <button
                        onClick={() => addToast('success', 'Transaction Confirmed', 'Your transaction was successful!')}
                        className="px-3 py-1.5 bg-[#2CC295] text-black font-bold rounded-lg hover:bg-[#2CC295]/90 transition-all text-[10px]"
                      >
                        Show Success
                      </button>
                      <button
                        onClick={() => addToast('error', 'Transaction Failed', 'Your transaction was reverted.')}
                        className="px-3 py-1.5 bg-[#ef4444] text-white font-bold rounded-lg hover:bg-[#ef4444]/90 transition-all text-[10px]"
                      >
                        Show Error
                      </button>
                      <button
                        onClick={() => addToast('warning', 'Warning', 'High slippage detected.')}
                        className="px-3 py-1.5 bg-[#f59e0b] text-black font-bold rounded-lg hover:bg-[#f59e0b]/90 transition-all text-[10px]"
                      >
                        Show Warning
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Design Specs */}
              <section className="border-t border-[#27272a] pt-12">
                <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                      Design Specs
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Primary Color */}
                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-[#27272a]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-4 h-4 bg-[#2CC295] rounded"></div>
                        <span className="text-[10px] font-bold text-white font-mono">#2CC295</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed uppercase font-bold tracking-tight">
                        System Primary Green
                      </p>
                    </div>

                    {/* Animation */}
                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-[#27272a]">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare size={14} className="text-zinc-400" />
                        <span className="text-[10px] font-bold text-white">Spring (500, 30)</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed uppercase font-bold tracking-tight">
                        Global Motion Curve
                      </p>
                    </div>

                    {/* Shadow */}
                    <div className="p-4 bg-zinc-900/50 rounded-xl border border-[#27272a]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-4 h-4 bg-[#2CC295]/20 rounded-full blur-sm"></div>
                        <span className="text-[10px] font-bold text-white">Glow: 15px</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed uppercase font-bold tracking-tight">
                        Badge Shadow Intensity
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Integration Guide */}
              <section className="border-t border-[#27272a] pt-12">
                <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">
                      Integration
                    </h3>
                    <p className="text-xs text-zinc-600 mt-2">
                      Check navbar bell icon for live demo.
                    </p>
                  </div>

                  <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-xl p-6">
                    <h4 className="text-sm font-bold text-white mb-4">Notification Center Features</h4>
                    <ul className="space-y-3 text-sm text-zinc-400">
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded bg-[#2CC295]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Package size={12} className="text-[#2CC295]" />
                        </div>
                        <div>
                          <strong className="text-white">420px dropdown</strong> - Optimized width with responsive design
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded bg-[#2CC295]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Package size={12} className="text-[#2CC295]" />
                        </div>
                        <div>
                          <strong className="text-white">Filter pills</strong> - All, Orders, Messages, System with teal active state
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded bg-[#2CC295]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Package size={12} className="text-[#2CC295]" />
                        </div>
                        <div>
                          <strong className="text-white">Unread indicators</strong> - Teal glow dots for unread notifications
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded bg-[#2CC295]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Package size={12} className="text-[#2CC295]" />
                        </div>
                        <div>
                          <strong className="text-white">Colored icons</strong> - Orange (orders), Teal (messages), Gray (system)
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded bg-[#2CC295]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Package size={12} className="text-[#2CC295]" />
                        </div>
                        <div>
                          <strong className="text-white">Settings modal</strong> - Toggle switches and checkboxes for preferences
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          ) : activeTab === 'cards' ? (
            /* CARD LAYOUT TAB */
            <CardLayoutTab />
          ) : (
            /* TESTING LAB TAB */
            <div className="space-y-8">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Bell className="text-[#2CC295]" size={24} />
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                      Total
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-white">{notifications.length}</p>
                </div>

                <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-3 h-3 bg-[#2CC295] rounded-full animate-pulse" />
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                      Unread
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-[#2CC295]">{unreadCount}</p>
                </div>

                <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle className="text-green-400" size={24} />
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                      Read
                    </h3>
                  </div>
                  <p className="text-3xl font-bold text-white">{notifications.length - unreadCount}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pre-built Examples */}
                <section>
                  <h2 className="text-xl font-bold text-white mb-4">Pre-built Examples</h2>
                  <div className="space-y-3">
                    {demoNotifications.map((demo, index) => (
                      <button
                        key={index}
                        onClick={() => handleAddDemo(demo)}
                        className="w-full text-left bg-[rgba(255,255,255,0.02)] border-0 rounded-xl p-4 hover:border-[#2CC295]/50 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            demo.type === 'order' ? 'bg-orange-500/10 text-orange-400' :
                            demo.type === 'message' ? 'bg-[#2CC295]/10 text-[#2CC295]' :
                            demo.type === 'system' ? 'bg-zinc-500/10 text-zinc-400' :
                            demo.type === 'success' ? 'bg-green-500/10 text-green-400' :
                            demo.type === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-red-500/10 text-red-400'
                          } flex-shrink-0`}>
                            {demo.type === 'order' && <Package size={18} />}
                            {demo.type === 'message' && <MessageSquare size={18} />}
                            {demo.type === 'system' && <SettingsIcon size={18} />}
                            {demo.type === 'success' && <CheckCircle size={18} />}
                            {demo.type === 'warning' && <AlertTriangle size={18} />}
                            {demo.type === 'error' && <XCircle size={18} />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-white mb-1 group-hover:text-[#2CC295] transition-colors">
                              {demo.title}
                            </h3>
                            <p className="text-xs text-zinc-400 line-clamp-2">
                              {demo.message}
                            </p>
                          </div>

                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-[#2CC295] font-bold">Add →</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Custom Notification Creator */}
                <section>
                  <h2 className="text-xl font-bold text-white mb-4">Create Custom</h2>
                  <div className="bg-[rgba(255,255,255,0.02)] border-0 rounded-2xl p-6">
                    <div className="space-y-4">
                      {/* Type selector */}
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                          Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {typeOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setSelectedType(option.value)}
                              className={`
                                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all
                                ${selectedType === option.value
                                  ? 'bg-[#2CC295] text-black'
                                  : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
                                }
                              `}
                            >
                              <span className={selectedType === option.value ? 'text-black' : option.color}>
                                {option.icon}
                              </span>
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Title input */}
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                          Title
                        </label>
                        <input
                          type="text"
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          placeholder="Enter notification title..."
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#2CC295] transition-colors"
                        />
                      </div>

                      {/* Message input */}
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                          Message
                        </label>
                        <textarea
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          placeholder="Enter notification message..."
                          rows={4}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#2CC295] transition-colors resize-none"
                        />
                      </div>

                      {/* Submit button */}
                      <button
                        onClick={handleAddCustom}
                        className="w-full bg-[#2CC295] hover:bg-[#25a882] text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Bell size={18} />
                        Add Notification
                      </button>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="mt-6 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wider">
                      💡 How to Use
                    </h3>
                    <ul className="text-xs text-zinc-400 space-y-1.5">
                      <li>• Click pre-built examples to add instantly</li>
                      <li>• Or create custom notifications with any content</li>
                      <li>• Check the bell icon in navbar to see notifications</li>
                      <li>• Notifications persist across page refreshes</li>
                      <li>• Desktop notifications require permission (click settings)</li>
                    </ul>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}