import { LayoutDashboard, ShoppingCart, Store, Sparkles, Package, Users, Mail, User, History, ChevronsLeft, ChevronsRight, Bell, FileText, Heart, BarChart3, CheckSquare, Search, Palette, Receipt } from 'lucide-react';

interface LeftSidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export function LeftSidebar({ activePage, setActivePage, collapsed, onToggle }: LeftSidebarProps) {
  const menuItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'orders', icon: ShoppingCart, label: 'Orders' },
    { id: 'marketplace', icon: Store, label: 'Marketplace' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'minting', icon: Sparkles, label: 'Minting' },
    { id: 'assets', icon: Package, label: 'Assets' },
    { id: 'my-receipts', icon: Receipt, label: 'My Receipts' },
    { id: 'asset-details', icon: FileText, label: 'Asset Details' },
    { id: 'favorites', icon: Heart, label: 'My Collections' },
    { id: 'community', icon: Users, label: 'Community' },
    { id: 'messages', icon: Mail, label: 'Messages' },
    { id: 'profile', icon: User, label: 'User Profile' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'bulk-demo', icon: CheckSquare, label: 'Bulk Operations' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'notification-demo', icon: Bell, label: 'Notifications' },
    { id: 'style-guide', icon: Palette, label: 'Style Guide' },
  ];

  return (
    <aside className={`bg-[#141417] border-r border-[#27272a] flex flex-col h-full overflow-hidden transition-all duration-300 ${collapsed ? 'w-[64px]' : 'w-[180px]'}`}>
      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 pt-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`
          .flex-1::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`
                flex items-center rounded-lg w-full transition-all group relative
                focus:outline-none focus-visible:outline-none
                focus:ring-0 focus-visible:ring-0 active:ring-0
                focus:border-transparent focus-visible:border-transparent
                focus:shadow-none focus-visible:shadow-none
                ${collapsed ? 'h-9 justify-center' : 'gap-2.5 px-2.5 py-2'}
                ${
                  isActive
                    ? collapsed 
                      ? 'bg-[#2CC295]/5 text-[#2CC295] !border-transparent'
                      : 'bg-[#2CC295]/5 text-[#2CC295] border border-[#2CC295]/10'
                    : collapsed
                      ? 'text-zinc-400 bg-transparent hover:bg-[#1a1a1c] hover:text-white !border-transparent'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white !border-transparent'
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} className={`${collapsed ? 'w-4 h-4' : 'w-4 h-4 flex-shrink-0'} pointer-events-none`} />
              {!collapsed && (
                <span className="text-xs font-medium truncate">{item.label}</span>
              )}
              
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 border border-[#27272a] rounded-lg text-xs text-white whitespace-nowrap invisible opacity-0 pointer-events-none group-hover:visible group-hover:opacity-100 transition-opacity z-50">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse Button - Fixed at bottom */}
      <div className="border-t border-[#27272a] p-3 bg-[#141417]">
        <button
          onClick={onToggle}
          className={`flex items-center rounded-lg w-full transition-all hover:bg-zinc-800/50 text-zinc-400 hover:text-white group relative !border-transparent focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 active:ring-0 focus:border-transparent focus-visible:border-transparent focus:shadow-none focus-visible:shadow-none ${
            collapsed ? 'h-9 justify-center' : 'gap-2.5 px-2.5 py-2'
          }`}
          title={collapsed ? (collapsed ? 'Expand sidebar' : 'Collapse sidebar') : undefined}
        >
          {collapsed ? (
            <ChevronsRight size={16} className="w-4 h-4 flex-shrink-0" />
          ) : (
            <>
              <ChevronsLeft size={16} className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-medium">Collapse</span>
            </>
          )}
          
          {/* Tooltip for collapsed state */}
          {collapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-zinc-900 border border-[#27272a] rounded-lg text-xs text-white whitespace-nowrap invisible opacity-0 pointer-events-none group-hover:visible group-hover:opacity-100 transition-opacity z-50">
              Expand sidebar
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
