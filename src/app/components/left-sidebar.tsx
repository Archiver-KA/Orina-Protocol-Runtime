import {
  ShoppingCart,
  Store,
  BarChart3,
  Sparkles,
  Package,
  Users,
  MessageSquare,
  Settings,
  Bot,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
} from 'lucide-react';
import { OrinaMark } from '@/app/components/brand/OrinaMark';
import { OrinaWordmark } from '@/app/components/brand/OrinaWordmark';
import { NetworkSwitcher } from '@/app/components/network-switcher';

interface LeftSidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  isGuest?: boolean;
}

export function LeftSidebar({
  activePage,
  setActivePage,
  collapsed,
  onToggle,
  isGuest = false,
}: LeftSidebarProps) {
  if (isGuest) return null;

  const navItems = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'orders', icon: ShoppingCart, label: 'Orders' },
    { id: 'marketplace', icon: Store, label: 'Marketplace' },
    { id: 'market-insights', icon: BarChart3, label: 'Insights' },
    { id: 'minting', icon: Sparkles, label: 'Minting' },
    { id: 'assets', icon: Package, label: 'Assets' },
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
    { id: 'community', icon: Users, label: 'Community' },
    { id: 'agent-settings', icon: Bot, label: 'Agent Setting' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside
      className={`bg-ui-page text-ui-secondary flex flex-col h-full overflow-hidden transition-all duration-300 ${
        collapsed ? 'w-[var(--t-shell-sidebar-collapsed-w)]' : 'w-[var(--t-shell-sidebar-w)]'
      }`}
    >
      <div className="h-full p-2.5">
        <div className={`h-full rounded-[24px] bg-[var(--t-card-bg)] backdrop-blur-[6px] flex flex-col overflow-hidden ${collapsed ? 'pt-5 pb-2.5 px-2.5' : 'p-5'}`}>
          <div className={`flex-shrink-0 ${collapsed ? 'flex items-center justify-center mb-5' : 'flex items-center gap-2.5 mb-5'}`}>
            <div className="w-9 h-9 flex-shrink-0">
              <OrinaMark />
            </div>
            {!collapsed && (
              <OrinaWordmark className="h-[18px] w-auto text-ui-strong" />
            )}
          </div>

          {!collapsed && (
            <div className="mb-4 h-px bg-[var(--t-border-subtle)]" />
          )}

          <div
            className="flex-1 overflow-y-auto custom-scrollbar"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;

                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setActivePage(item.id)}
                    className={`
                      sidebar-btn flex items-center rounded-[12px] w-full transition-all group relative bg-transparent
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC295]/35
                      ${collapsed ? 'h-10 w-10 mx-auto justify-center' : 'gap-3 px-3 py-2.5'}
                      ${
                        isActive
                          ? 'bg-[rgba(44,194,149,0.1)] text-[#2CC295]'
                          : 'text-ui-secondary hover:bg-[var(--t-surface-10)] hover:text-ui-primary'
                      }
                    `}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={16} className="w-4 h-4 flex-shrink-0 pointer-events-none" />
                    {!collapsed && (
                      <span
                        className={`text-[13px] truncate pointer-events-none ${
                          isActive ? 'font-bold' : 'font-medium'
                        } leading-[1.3]`}
                      >
                        {item.label}
                      </span>
                    )}

                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-ui-dropdown rounded-lg text-xs text-ui-primary whitespace-nowrap invisible opacity-0 pointer-events-none group-hover:visible group-hover:opacity-100 transition-opacity z-50 backdrop-blur-md">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className={`${collapsed ? 'mt-2 space-y-2' : 'mt-4 space-y-3 pt-3'}`}>
            <NetworkSwitcher sidebarCollapsed={collapsed} />

            <button
              onClick={onToggle}
              className={`sidebar-btn flex items-center rounded-[12px] transition-all text-ui-secondary hover:bg-[var(--t-surface-10)] hover:text-ui-primary group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2CC295]/35 ${
                collapsed ? 'h-10 w-10 mx-auto justify-center' : 'h-10 w-10 justify-center mx-auto'
              }`}
              title={collapsed ? 'Expand sidebar' : undefined}
            >
              {collapsed ? (
                <ChevronsRight size={16} className="w-4 h-4 flex-shrink-0 pointer-events-none" />
              ) : (
                <ChevronsLeft size={16} className="w-4 h-4 flex-shrink-0 pointer-events-none" />
              )}

              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-ui-dropdown rounded-lg text-xs text-ui-primary whitespace-nowrap invisible opacity-0 pointer-events-none group-hover:visible group-hover:opacity-100 transition-opacity z-50 backdrop-blur-md">
                  Expand sidebar
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
