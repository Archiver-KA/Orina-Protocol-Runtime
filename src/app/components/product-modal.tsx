import { X, Heart, Layers, MessageSquare, Star, Minus, Plus } from 'lucide-react';
import { useState } from 'react';

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
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="bg-[#141417] w-full max-w-5xl rounded-[2.5rem] border border-[#27272a] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        <div className="flex-grow overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 min-h-full">
            {/* Left Column - Image & Properties */}
            <div className="p-8 bg-zinc-900/30 flex flex-col">
              {/* Image Preview */}
              <div className="relative flex-grow flex items-center justify-center p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] backdrop-blur-xl rounded-[2rem] aspect-square overflow-hidden">
                <img
                  alt={product.name}
                  className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(44,194,149,0.2)]"
                  src={product.image}
                />
                <div className="absolute top-6 right-6 bg-black/40 px-4 py-2 rounded-xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
                  3D Preview
                </div>
                {/* Image Carousel Dots */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-2 bg-black/20 backdrop-blur-md rounded-full border border-white/5">
                  {[0, 1, 2].map((index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${
                        currentImageIndex === index ? 'bg-white' : 'bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Tabs & Properties */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="border-b border-[#27272a] flex-1">
                    <div className="flex gap-1">
                      {['Properties', 'History', 'Details'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-all relative ${
                            activeTab === tab
                              ? 'text-[#2CC295]'
                              : 'text-zinc-400 hover:text-zinc-300'
                          }`}
                        >
                          {tab}
                          {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2CC295] shadow-[0_0_12px_rgba(44,194,149,0.6)]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setIsFavorited(!isFavorited)}
                    className={`p-2 transition-colors ml-4 ${
                      isFavorited ? 'text-[#2CC295]' : 'text-zinc-500 hover:text-[#2CC295]'
                    }`}
                  >
                    <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'Properties' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-zinc-900/50 border border-[#27272a] rounded-2xl">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Background</p>
                      <p className="text-xs text-white font-medium">Nebula Mist (Rare)</p>
                    </div>
                    <div className="p-4 bg-zinc-900/50 border border-[#27272a] rounded-2xl">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Material</p>
                      <p className="text-xs text-white font-medium">Crystalline Quartz</p>
                    </div>
                    <div className="p-4 bg-zinc-900/50 border border-[#27272a] rounded-2xl">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Edition</p>
                      <p className="text-xs text-white font-medium">Limited #442/1000</p>
                    </div>
                    <div className="p-4 bg-zinc-900/50 border border-[#27272a] rounded-2xl">
                      <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Rarity</p>
                      <p className="text-xs text-white font-medium">Ultra Rare (2%)</p>
                    </div>
                  </div>
                )}

                {activeTab === 'History' && (
                  <div className="space-y-2">
                    <div className="p-3 bg-zinc-900/50 border border-[#27272a] rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Listed by Zen_Artist</span>
                        <span className="text-white font-bold">1.45 ETH</span>
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-1">2 days ago</p>
                    </div>
                    <div className="p-3 bg-zinc-900/50 border border-[#27272a] rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Minted by Zen_Artist</span>
                        <span className="text-white font-bold">0.08 ETH</span>
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-1">5 days ago</p>
                    </div>
                  </div>
                )}

                {activeTab === 'Details' && (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Contract Address</span>
                      <span className="text-white font-mono text-xs">0x71C...4f2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Token ID</span>
                      <span className="text-white font-mono text-xs">#442</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Token Standard</span>
                      <span className="text-white">ERC-721</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Blockchain</span>
                      <span className="text-white">Ethereum</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Product Details */}
            <div className="p-10 flex flex-col relative">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 p-1.5 rounded-xl border border-white/5"
              >
                <X size={20} />
              </button>

              {/* Badges */}
              <div className="flex gap-2 mb-4">
                <span className="bg-[#2CC295]/10 text-[#2CC295] text-[10px] px-2.5 py-1 rounded-lg uppercase font-bold tracking-tight border border-[#2CC295]/20">
                  {product.category}
                </span>
                {product.verified && (
                  <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2.5 py-1 rounded-lg uppercase font-bold tracking-tight border border-blue-500/20 flex items-center gap-1">
                    <Star size={12} fill="currentColor" />
                    Verified
                  </span>
                )}
              </div>

              {/* Product Name */}
              <h1 className="text-3xl font-extrabold text-white mb-6">{product.name}</h1>

              {/* Price Box */}
              <div className="bg-zinc-900/40 rounded-3xl p-6 border border-[#27272a]/50 mb-6">
                <p className="text-xs text-zinc-500 font-medium mb-2">Current Price</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-white tracking-tight">{product.price}</span>
                  <span className="text-lg text-zinc-500 font-medium">({product.usdPrice})</span>
                </div>
              </div>

              {/* Stock Info */}
              <div className="flex items-center gap-2 mb-8 px-1">
                <Layers className="text-zinc-500" size={18} />
                <span className="text-sm text-zinc-400">
                  Stock: <span className="text-white font-bold">{product.stock}</span> available
                </span>
              </div>

              {/* Seller Info */}
              <div className="mb-10">
                <label className="text-[10px] uppercase font-bold text-zinc-600 mb-4 block tracking-widest">
                  Listed by
                </label>
                <div
                  onClick={onNavigateToSeller}
                  className="flex items-center gap-4 p-4 bg-zinc-900/40 rounded-3xl border border-[#27272a]/50 cursor-pointer hover:border-[#2CC295]/30 transition-all group"
                >
                  <img
                    alt={product.seller.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-[#27272a] group-hover:border-[#2CC295]/30 transition-colors"
                    src={product.seller.avatar}
                  />
                  <div className="flex-grow">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-bold group-hover:text-[#2CC295] transition-colors">
                        {product.seller.name}
                      </span>
                      {product.seller.isCreator && (
                        <span className="bg-yellow-500/10 text-yellow-500 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold border border-yellow-500/20 tracking-tighter">
                          Creator
                        </span>
                      )}
                      <div className="flex items-center gap-0.5 ml-1 bg-zinc-800/50 px-1.5 py-0.5 rounded-lg border border-white/5">
                        <Star className="text-yellow-500" size={12} fill="currentColor" />
                        <span className="text-[10px] font-bold text-white">{product.seller.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500">{product.seller.memberSince}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-xl transition-colors border border-white/5"
                    >
                      <MessageSquare className="text-zinc-400" size={18} />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-bold text-[#2CC295] hover:text-white transition-colors bg-[#2CC295]/10 px-4 py-2 rounded-xl border border-[#2CC295]/20"
                    >
                      Follow
                    </button>
                  </div>
                </div>
              </div>

              {/* Quantity Selector & Buy Button */}
              <div className="space-y-6 mt-auto">
                <div className="flex items-center justify-between bg-zinc-900/30 border border-[#27272a]/50 rounded-2xl p-1.5">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="text-white font-bold text-sm">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <button className="w-full py-4 bg-[#2CC295] hover:bg-[#2CC295]/90 text-black font-extrabold rounded-2xl transition-all hover:shadow-lg hover:shadow-[#2CC295]/20 text-sm uppercase tracking-widest h-[54px] flex items-center justify-center">
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
