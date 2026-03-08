import { MessageSquare, Star, ArrowRight, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { StudioModalCloseButton } from '@/app/components/ui/studio-modal';

interface SellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  seller: {
    name: string;
    avatar: string;
    rating: string;
    memberSince: string;
    isCreator: boolean;
    isVerified: boolean;
    totalSales: string;
    floorPrice: string;
    reviewCount: number;
  };
}

const featuredNFTs = [
  {
    id: 1,
    name: 'Ethereal #442',
    price: '1.45 ETH',
    image: 'https://source.unsplash.com/400x400/?3d,crystal,abstract'
  },
  {
    id: 2,
    name: 'Cyber Neon',
    price: '0.98 ETH',
    image: 'https://source.unsplash.com/400x400/?cyberpunk,neon,digital'
  },
  {
    id: 3,
    name: 'Void Entity',
    price: '2.10 ETH',
    image: 'https://source.unsplash.com/400x400/?dark,energy,abstract'
  },
  {
    id: 4,
    name: 'Quantum Orb',
    price: '3.25 ETH',
    image: 'https://source.unsplash.com/400x400/?sphere,light,energy'
  },
  {
    id: 5,
    name: 'Neon Blade',
    price: '1.60 ETH',
    image: 'https://source.unsplash.com/400x400/?sword,neon,glow'
  },
  {
    id: 6,
    name: 'Shadow Core',
    price: '2.85 ETH',
    image: 'https://source.unsplash.com/400x400/?dark,core,digital'
  }
];

const reviews = [
  {
    id: 1,
    author: 'CryptoWhale_88',
    avatar: 'https://source.unsplash.com/100x100/?portrait,man,professional',
    rating: 5,
    date: '2 days ago',
    comment: 'Amazing attention to detail. The textures on the Ethereal series are truly next level. Fast transfer and excellent communication throughout the purchase process.'
  },
  {
    id: 2,
    author: 'DigitalCollector',
    avatar: 'https://source.unsplash.com/100x100/?portrait,woman,business',
    rating: 4.5,
    date: '1 week ago',
    comment: 'Been following Zen_Artist for a while. This latest drop is fire. Only giving 4.5 because I wish there were more physical perks, but the art is 10/10.'
  },
  {
    id: 3,
    author: 'Meta_Vault',
    avatar: 'https://source.unsplash.com/100x100/?portrait,person,art',
    rating: 5,
    date: '2 weeks ago',
    comment: 'One of the most professional creators on this platform. A true asset to the Web3 community.'
  },
  {
    id: 4,
    author: 'NFT_Enthusiast',
    avatar: 'https://source.unsplash.com/100x100/?avatar,user',
    rating: 5,
    date: '3 weeks ago',
    comment: 'Absolutely stunning work! The creativity and quality are unmatched. Will definitely be buying more from this artist.'
  }
];

export function SellerModal({ isOpen, onClose, seller }: SellerModalProps) {
  const [activeTab, setActiveTab] = useState<'creations' | 'reviews'>('creations');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'positive' | 'critical'>('all');

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} size={14} className="text-yellow-500" fill="currentColor" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Star key="half" size={14} className="text-yellow-500" fill="currentColor" style={{ opacity: 0.5 }} />
      );
    }

    return stars;
  };

  return (
    <div
      className="studio-portal-backdrop fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/70 backdrop-blur-[10px]"
      onClick={handleOverlayClick}
    >
      <div className="studio-modal-theme studio-glass-modal w-full max-w-2xl h-[90vh] rounded-[24px] border border-ui-border-subtle bg-ui-card backdrop-blur-[20px] shadow-[0_24px_60px_-32px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative">
        {/* Close Button */}
        <StudioModalCloseButton onClick={onClose} className="studio-glass-secondary absolute top-8 right-8 z-20" />

        {/* Header Section */}
        <div className="p-10 pb-6 shrink-0">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative mb-4">
              <img
                alt={seller.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-ui-border-subtle shadow-2xl"
                src={seller.avatar}
              />
              {seller.isVerified && (
                <div className="absolute bottom-1 right-1 bg-[var(--color-primary-custom)] rounded-full p-1 border-4 border-ui-border-subtle flex items-center justify-center">
                  <CheckCircle size={12} className="text-[var(--color-button-primary-fg)]" fill="currentColor" />
                </div>
              )}
            </div>

            {/* Name & Badges */}
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-extrabold text-ui-primary">{seller.name}</h2>
              {seller.isCreator && (
                <span className="bg-[var(--color-primary-custom)]/10 text-primary text-[9px] px-2 py-0.5 rounded uppercase font-bold border border-[var(--color-primary-custom)]/20 tracking-tighter">
                  Creator
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 mt-4">
              <button className="px-8 py-2.5 bg-[var(--color-button-primary-bg)] hover:bg-[var(--color-button-primary-bg-hover)] text-[var(--color-button-primary-fg)] font-bold rounded-xl transition-all text-sm">
                Follow
              </button>
              <button className="w-11 h-11 bg-[var(--color-primary-custom)]/10 hover:bg-[var(--color-primary-custom)]/20 text-primary rounded-xl border border-[var(--color-primary-custom)]/20 flex items-center justify-center transition-all">
                <MessageSquare size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="studio-glass-header px-10 py-0 border-t border-ui-border-subtle bg-[var(--t-surface-2)] shrink-0">
          <div className="grid grid-cols-3 gap-4 py-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="text-yellow-500" size={14} fill="currentColor" />
                <span className="text-ui-primary font-bold text-base tracking-tight">{seller.rating}</span>
              </div>
              <p className="text-[10px] text-ui-muted uppercase font-bold tracking-widest">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-ui-primary font-bold text-base tracking-tight mb-1">{seller.totalSales}</p>
              <p className="text-[10px] text-ui-muted uppercase font-bold tracking-widest">Total Sales</p>
            </div>
            <div className="text-center">
              <p className="text-ui-primary font-bold text-base tracking-tight mb-1">{seller.floorPrice}</p>
              <p className="text-[10px] text-ui-muted uppercase font-bold tracking-widest">Floor Price</p>
            </div>
          </div>

          <p className="text-center text-[10px] text-ui-muted mb-6 italic">{seller.memberSince}</p>

          {/* Tabs */}
          <div className="flex items-center justify-center gap-8 border-t border-ui-border-subtle">
            <button
              onClick={() => setActiveTab('creations')}
              className={`py-4 text-xs uppercase font-bold tracking-widest border-b-2 transition-all ${
                activeTab === 'creations'
                  ? 'border-[var(--color-primary-custom)] text-ui-primary'
                  : 'border-transparent text-ui-muted hover:text-ui-secondary'
              }`}
            >
              Creations
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-4 text-xs uppercase font-bold tracking-widest border-b-2 transition-all ${
                activeTab === 'reviews'
                  ? 'border-[var(--color-primary-custom)] text-ui-primary'
                  : 'border-transparent text-ui-muted hover:text-ui-secondary'
              }`}
            >
              Reviews ({seller.reviewCount})
            </button>
          </div>
        </div>

        {/* Tab Content - Creations */}
        {activeTab === 'creations' && (
          <div className="flex-grow overflow-y-auto custom-scrollbar p-10 pt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs uppercase font-bold text-ui-secondary tracking-widest">Featured Creations</h3>
              <span className="text-xs text-primary font-medium hover:underline cursor-pointer">View All</span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-10">
              {featuredNFTs.map((nft) => (
                <div
                  key={nft.id}
                  className="studio-glass-surface bg-[var(--t-surface-5)] border border-ui-border-subtle backdrop-blur-xl rounded-2xl p-2 hover:bg-[var(--t-surface-10)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                >
                  <div className="aspect-square rounded-xl overflow-hidden mb-3">
                    <img
                      alt={nft.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      src={nft.image}
                    />
                  </div>
                  <div className="px-1 pb-1">
                    <p className="text-[10px] font-bold text-ui-primary truncate mb-1">{nft.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-ui-muted">Price</span>
                      <span className="text-[10px] font-bold text-primary">{nft.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pb-6">
              <button className="w-full py-4 bg-[var(--color-button-primary-bg)] hover:bg-[var(--color-button-primary-bg-hover)] text-[var(--color-button-primary-fg)] font-extrabold rounded-2xl transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2">
                View Full Profile
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Tab Content - Reviews */}
        {activeTab === 'reviews' && (
          <div className="flex-grow overflow-y-auto custom-scrollbar p-10 pt-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <h3 className="text-xs uppercase font-bold text-ui-secondary tracking-widest">Detailed Feedback</h3>
                <div className="flex items-center gap-1 bg-[var(--t-surface-10)] px-2 py-0.5 rounded text-[10px] font-bold text-ui-primary border border-ui-border-subtle">
                  <Star className="text-yellow-500" size={12} fill="currentColor" />
                  {seller.rating} ({seller.reviewCount} Reviews)
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setReviewFilter('all')}
                  className={`text-[10px] font-bold uppercase tracking-tighter px-3 py-1 rounded-full transition-colors ${
                    reviewFilter === 'all'
                      ? 'bg-[var(--color-primary-custom)]/20 text-primary border border-[var(--color-primary-custom)]/30'
                      : 'hover:bg-[var(--t-surface-10)] text-ui-muted border border-ui-border-subtle'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setReviewFilter('positive')}
                  className={`text-[10px] font-bold uppercase tracking-tighter px-3 py-1 rounded-full transition-colors ${
                    reviewFilter === 'positive'
                      ? 'bg-[var(--color-primary-custom)]/20 text-primary border border-[var(--color-primary-custom)]/30'
                      : 'hover:bg-[var(--t-surface-10)] text-ui-muted border border-ui-border-subtle'
                  }`}
                >
                  Positive
                </button>
                <button
                  onClick={() => setReviewFilter('critical')}
                  className={`text-[10px] font-bold uppercase tracking-tighter px-3 py-1 rounded-full transition-colors ${
                    reviewFilter === 'critical'
                      ? 'bg-[var(--color-primary-custom)]/20 text-primary border border-[var(--color-primary-custom)]/30'
                      : 'hover:bg-[var(--t-surface-10)] text-ui-muted border border-ui-border-subtle'
                  }`}
                >
                  Critical
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="studio-glass-surface bg-[var(--t-surface-5)] border border-ui-border-subtle backdrop-blur-xl rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--t-surface-10)] border border-ui-border-subtle overflow-hidden">
                        <img alt={review.author} className="w-full h-full object-cover" src={review.avatar} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ui-primary">{review.author}</p>
                        <div className="flex gap-0.5">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-ui-muted font-medium">{review.date}</span>
                  </div>
                  <p className="text-sm text-ui-secondary leading-relaxed italic">"{review.comment}"</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
