import { LayoutDashboard, ShoppingCart, Store, Sparkles, Package, Users, MessageSquare, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface LeftSidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  isGuest?: boolean;
}

export function LeftSidebar({ activePage, setActivePage, collapsed, onToggle, isGuest = false }: LeftSidebarProps) {
  if (isGuest) return null;

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'orders', icon: ShoppingCart, label: 'Orders' },
    { id: 'marketplace', icon: Store, label: 'Marketplace' },
    { id: 'minting', icon: Sparkles, label: 'Minting' },
    { id: 'assets', icon: Package, label: 'Assets' },
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
    { id: 'community', icon: Users, label: 'Community' },
  ];

  return (
    <aside className={`bg-zinc-900/30 border-r border-[#27272a] flex flex-col h-full overflow-hidden transition-all duration-300 ${collapsed ? 'w-[64px]' : 'w-[180px]'}`}>
      {/* FORCE OVERRIDE ALL BUTTON STYLES */}
      <style>{`
        .sidebar-btn-fix {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          appearance: none !important;
          border-width: 0 !important;
          border-style: none !important;
          border-color: transparent !important;
          outline-width: 0 !important;
          outline-style: none !important;
          outline-color: transparent !important;
          outline-offset: 0 !important;
          background-image: none !important;
          /* REMOVED background-color from parent to allow Tailwind hover */
        }
        .sidebar-btn-fix:hover,
        .sidebar-btn-fix:focus,
        .sidebar-btn-fix:active,
        .sidebar-btn-fix:focus-visible {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          border-width: 0 !important;
          outline-width: 0 !important;
          background-image: none !important;
          /* REMOVED background-color from states to allow Tailwind hover */
        }
        /* Kill all descendants ONLY - not parent */
        .sidebar-btn-fix *,
        .sidebar-btn-fix *:hover,
        .sidebar-btn-fix *:focus,
        .sidebar-btn-fix *:active {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background-image: none !important;
          background-color: transparent !important;
        }
        .flex-1::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      {/* Menu Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 pt-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`
                sidebar-btn-fix sidebar-btn flex items-center rounded-lg w-full transition-all group relative
                focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 active:outline-none
                ${collapsed ? 'h-9 justify-center' : 'gap-2.5 px-2.5 py-2'}
                ${
                  isActive
                    ? 'bg-[#2CC295]/5 text-[#2CC295]'
                    : 'text-zinc-500 hover:bg-zinc-800/50 hover:text-white'
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} className="w-4 h-4 flex-shrink-0 pointer-events-none" />
              {!collapsed && (
                <span className="text-xs font-medium truncate pointer-events-none">{item.label}</span>
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
      <div className="border-t border-[#27272a] p-3">
        <button
          onClick={onToggle}
          className={`sidebar-btn-fix sidebar-btn flex items-center rounded-lg w-full transition-all text-zinc-500 hover:bg-zinc-800/50 hover:text-white group relative focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 active:outline-none ${
            collapsed ? 'h-9 justify-center' : 'gap-2.5 px-2.5 py-2'
          }`}
          title={collapsed ? 'Expand sidebar' : undefined}
        >
          {collapsed ? (
            <ChevronsRight size={16} className="w-4 h-4 flex-shrink-0 pointer-events-none" />
          ) : (
            <>
              <ChevronsLeft size={16} className="w-4 h-4 flex-shrink-0 pointer-events-none" />
              <span className="text-xs font-medium pointer-events-none">Collapse</span>
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
