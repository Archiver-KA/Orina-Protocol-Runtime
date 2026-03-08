import { Heart, Layers, MessageSquare, Star, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSeller?: () => void;
  product: {
    id: number;
    name: string;
    price: string;
    usdPrice: string;
    image: string;
    seller: {
      name: string;
      avatar: string;
      rating: string;
      memberSince: string;
      isCreator: boolean;
    };
    stock: string;
    category: string;
    verified: boolean;
  };
}

export function ProductModal({ isOpen, onClose, onNavigateToSeller, product }: ProductModalProps) {
  const [activeTab, setActiveTab] = useState('Properties');
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="studio-portal-backdrop fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/70 backdrop-blur-[10px]"
      onClick={handleOverlayClick}
    >
      <div className="studio-modal-theme studio-glass-modal w-full max-w-5xl max-h-[95vh] md:h-[95vh] rounded-[24px] border border-ui-border-subtle bg-ui-card backdrop-blur-[20px] shadow-[0_24px_60px_-32px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-full">
            {/* Left Column - Image & Properties */}
            <div className="studio-glass-header p-8 bg-[var(--t-surface-2)] flex flex-col">
              {/* Image Preview */}
              <div className="studio-glass-surface relative flex-grow flex items-center justify-center p-4 bg-[var(--t-surface-5)] border border-ui-border-subtle backdrop-blur-xl rounded-[2rem] aspect-square overflow-hidden">
                <img
                  alt={product.name}
                  className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(44,194,149,0.2)]"
                  src={product.image}
                />
                <div className="studio-glass-chip absolute top-6 right-6 bg-[var(--t-surface-10)] px-4 py-2 rounded-xl border border-ui-border-subtle text-[10px] font-bold uppercase tracking-widest text-ui-primary backdrop-blur-md">
                  3D Preview
                </div>
                {/* Image Carousel Dots */}
                <div className="studio-glass-chip absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-2 bg-[var(--t-surface-5)] backdrop-blur-md rounded-full border border-ui-border-subtle">
                  {[0, 1, 2].map((index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        currentImageIndex === index ? 'bg-[var(--color-primary-custom)]' : 'bg-[var(--t-border-medium)]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Tabs & Properties */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="border-b border-ui-border-subtle flex-1">
                    <div className="flex gap-1">
                      {['Properties', 'History', 'Details'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all relative ${
                            activeTab === tab
                              ? 'text-primary'
                              : 'text-ui-muted hover:text-ui-primary'
                          }`}
                        >
                          {tab}
                          {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary-custom)] shadow-[0_0_12px_rgba(44,194,149,0.6)]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setIsFavorited(!isFavorited)}
                    className={`p-2 transition-colors ml-4 ${
                      isFavorited ? 'text-primary' : 'text-ui-muted hover:text-primary'
                    }`}
                  >
                    <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'Properties' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="studio-glass-surface p-4 bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-2xl">
                      <p className="text-[10px] text-ui-muted uppercase font-bold mb-1">Background</p>
                      <p className="text-xs text-ui-primary font-medium">Nebula Mist (Rare)</p>
                    </div>
                    <div className="studio-glass-surface p-4 bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-2xl">
                      <p className="text-[10px] text-ui-muted uppercase font-bold mb-1">Material</p>
                      <p className="text-xs text-ui-primary font-medium">Crystalline Quartz</p>
                    </div>
                    <div className="studio-glass-surface p-4 bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-2xl">
                      <p className="text-[10px] text-ui-muted uppercase font-bold mb-1">Edition</p>
                      <p className="text-xs text-ui-primary font-medium">Limited #442/1000</p>
                    </div>
                    <div className="studio-glass-surface p-4 bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-2xl">
                      <p className="text-[10px] text-ui-muted uppercase font-bold mb-1">Rarity</p>
                      <p className="text-xs text-ui-primary font-medium">Ultra Rare (2%)</p>
                    </div>
                  </div>
                )}

                {activeTab === 'History' && (
                  <div className="space-y-2">
                    <div className="studio-glass-surface p-3 bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ui-secondary">Listed by Zen_Artist</span>
                        <span className="text-ui-primary font-bold">1.45 ETH</span>
                      </div>
                      <p className="text-[10px] text-ui-muted mt-1">2 days ago</p>
                    </div>
                    <div className="studio-glass-surface p-3 bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ui-secondary">Minted by Zen_Artist</span>
                        <span className="text-ui-primary font-bold">0.08 ETH</span>
                      </div>
                      <p className="text-[10px] text-ui-muted mt-1">5 days ago</p>
                    </div>
                  </div>
                )}

                {activeTab === 'Details' && (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ui-muted">Contract Address</span>
                      <span className="text-ui-primary font-mono text-xs">0x71C...4f2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ui-muted">Token ID</span>
                      <span className="text-ui-primary font-mono text-xs">#442</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ui-muted">Token Standard</span>
                      <span className="text-ui-primary">ERC-721</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ui-muted">Blockchain</span>
                      <span className="text-ui-primary">Ethereum</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Product Details */}
            <div className="p-10 flex flex-col relative">
              {/* Close Button */}
              <StudioModalCloseButton onClick={onClose} className="studio-glass-secondary absolute top-8 right-8" />

              {/* Badges */}
              <div className="flex gap-2 mb-4">
                <span className="studio-glass-chip bg-[var(--t-surface-5)] text-ui-secondary text-[10px] px-2.5 py-1 rounded-lg uppercase font-bold tracking-tight border border-ui-border-subtle">
                  {product.category}
                </span>
                {product.verified && (
                  <span className="studio-glass-chip bg-[var(--t-surface-5)] text-ui-secondary text-[10px] px-2.5 py-1 rounded-lg uppercase font-bold tracking-tight border border-ui-border-subtle flex items-center gap-1">
                    <Star size={12} fill="currentColor" />
                    Verified
                  </span>
                )}
              </div>

              {/* Product Name */}
              <h1 className="text-3xl font-extrabold text-ui-primary mb-6">{product.name}</h1>

              {/* Price Box */}
              <div className="studio-glass-surface bg-[var(--t-surface-5)] rounded-3xl p-6 border border-ui-border-subtle mb-6">
                <p className="text-xs text-ui-muted font-medium mb-2">Current Price</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-ui-primary tracking-tight">{product.price}</span>
                  <span className="text-lg text-ui-secondary font-medium">({product.usdPrice})</span>
                </div>
              </div>

              {/* Stock Info */}
              <div className="flex items-center gap-2 mb-8 px-1">
                <Layers className="text-ui-muted" size={18} />
                <span className="text-sm text-ui-secondary">
                  Stock: <span className="text-ui-primary font-bold">{product.stock}</span> available
                </span>
              </div>

              {/* Seller Info */}
              <div className="mb-10">
                <label className="text-[10px] uppercase font-bold text-ui-muted mb-4 block tracking-widest">
                  Listed by
                </label>
                <div
                  onClick={onNavigateToSeller}
                  className="studio-glass-surface flex items-center gap-4 p-4 bg-[var(--t-surface-5)] rounded-3xl border border-ui-border-subtle cursor-pointer hover:border-[var(--color-primary-custom)]/30 transition-all group"
                >
                  <img
                    alt={product.seller.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-ui-border-subtle group-hover:border-[var(--color-primary-custom)]/30 transition-colors"
                    src={product.seller.avatar}
                  />
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-ui-primary font-bold group-hover:text-primary transition-colors">
                        {product.seller.name}
                      </span>
                      {product.seller.isCreator && (
                        <span className="bg-[var(--color-primary-custom)]/10 text-primary text-[9px] px-1.5 py-0.5 rounded uppercase font-bold border border-[var(--color-primary-custom)]/20 tracking-tighter">
                          Creator
                        </span>
                      )}
                      <div className="flex items-center gap-0.5 ml-1 bg-[var(--t-surface-10)] px-1.5 py-0.5 rounded-lg border border-ui-border-subtle">
                        <Star className="text-yellow-500" size={12} fill="currentColor" />
                        <span className="text-[10px] font-bold text-ui-primary">{product.seller.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-ui-muted">{product.seller.memberSince}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="studio-glass-secondary p-2 bg-[var(--t-surface-10)] hover:bg-[var(--t-surface-hover)] rounded-xl transition-colors border border-ui-border-subtle"
                    >
                      <MessageSquare className="text-ui-secondary" size={18} />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-bold text-primary hover:text-[var(--color-button-primary-fg)] transition-colors bg-[var(--color-primary-custom)]/10 px-4 py-2 rounded-xl border border-[var(--color-primary-custom)]/20"
                    >
                      Follow
                    </button>
                  </div>
                </div>
              </div>

              {/* Quantity Selector & Buy Button */}
              <div className="space-y-6 mt-auto">
                <div className="studio-glass-surface flex items-center justify-between bg-[var(--t-surface-5)] border border-ui-border-subtle rounded-2xl p-1.5">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-ui-secondary hover:text-ui-primary transition-colors"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="text-ui-primary font-bold text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-ui-secondary hover:text-ui-primary transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <button className="w-full py-4 bg-[var(--color-button-primary-bg)] hover:bg-[var(--color-button-primary-bg-hover)] text-[var(--color-button-primary-fg)] font-extrabold rounded-2xl transition-all text-sm uppercase tracking-widest h-[54px] flex items-center justify-center">
                  Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
