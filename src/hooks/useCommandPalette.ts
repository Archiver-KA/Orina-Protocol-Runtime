import { useState, useEffect, useMemo, useCallback } from 'react';
import { Command, SearchResult } from '@/types/command';
import { searchCommands, saveRecentCommand, loadRecentCommands } from '@/utils/commandUtils';

/**
 * Hook for command palette functionality
 */
export function useCommandPalette(
  setActivePage: (page: string) => void,
  onCloseModal?: () => void,
  onToggleSidebar?: () => void,
  options?: {
    canAccessPage?: (page: string) => boolean;
    isGuest?: boolean;
  }
) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const canAccessPage = options?.canAccessPage;

  const isCommandAllowed = (commandId: string): boolean => {
    if (!canAccessPage) return true;
    const pageMap: Record<string, string> = {
      'nav-overview': 'overview',
      'nav-marketplace': 'marketplace',
      'nav-search': 'search',
      'nav-orders': 'orders',
      'nav-minting': 'minting',
      'nav-assets': 'assets',
      'nav-community': 'community',
      'nav-profile': 'profile',
      'nav-favorites': 'favorites',
      'nav-messages': 'messages',
      'nav-history': 'history',
      'action-create-order': 'orders',
      'action-mint-asset': 'minting',
      'settings-profile': 'profile',
      'settings-notifications': 'profile',
    };
    const page = pageMap[commandId];
    return page ? canAccessPage(page) : true;
  };

  // Define all available commands
  const commands: Command[] = useMemo(() => [
    // Navigation
    {
      id: 'nav-overview',
      label: 'Overview',
      description: 'Go to dashboard overview',
      category: 'navigation',
      keywords: ['dashboard', 'home', 'main'],
      icon: '📊',
      action: () => {
        setActivePage('overview');
        saveRecentCommand('nav-overview', 'Overview');
      },
    },
    {
      id: 'nav-marketplace',
      label: 'Marketplace',
      description: 'Browse and buy assets',
      category: 'navigation',
      keywords: ['buy', 'shop', 'browse'],
      icon: '🛒',
      action: () => {
        setActivePage('marketplace');
        saveRecentCommand('nav-marketplace', 'Marketplace');
      },
    },
    {
      id: 'nav-search',
      label: 'Search',
      description: 'Search for assets',
      category: 'navigation',
      keywords: ['find', 'search', 'filter', 'lookup'],
      icon: '🔍',
      action: () => {
        setActivePage('search');
        saveRecentCommand('nav-search', 'Search');
      },
    },
    {
      id: 'nav-orders',
      label: 'Orders',
      description: 'View your orders',
      category: 'navigation',
      keywords: ['transactions', 'purchases'],
      icon: '📦',
      action: () => {
        setActivePage('orders');
        saveRecentCommand('nav-orders', 'Orders');
      },
    },
    {
      id: 'nav-minting',
      label: 'Minting',
      description: 'Mint new assets',
      category: 'navigation',
      keywords: ['create', 'mint', 'new'],
      icon: '✨',
      action: () => {
        setActivePage('minting');
        saveRecentCommand('nav-minting', 'Minting');
      },
    },
    {
      id: 'nav-assets',
      label: 'Assets',
      description: 'View your assets',
      category: 'navigation',
      keywords: ['portfolio', 'collection'],
      icon: '💎',
      action: () => {
        setActivePage('assets');
        saveRecentCommand('nav-assets', 'Assets');
      },
    },
    {
      id: 'nav-community',
      label: 'Community',
      description: 'View community feed',
      category: 'navigation',
      keywords: ['social', 'feed', 'posts'],
      icon: '👥',
      action: () => {
        setActivePage('community');
        saveRecentCommand('nav-community', 'Community');
      },
    },
    {
      id: 'nav-profile',
      label: 'Profile',
      description: 'View your profile',
      category: 'navigation',
      keywords: ['account', 'user', 'settings'],
      icon: '👤',
      action: () => {
        setActivePage('profile');
        saveRecentCommand('nav-profile', 'Profile');
      },
    },
    {
      id: 'nav-favorites',
      label: 'My Collections',
      description: 'View favorites & watchlist',
      category: 'navigation',
      keywords: ['favorites', 'liked', 'saved', 'bookmarks', 'watchlist', 'watch', 'alerts', 'tracking'],
      icon: '❤️',
      action: () => {
        setActivePage('favorites');
        saveRecentCommand('nav-favorites', 'My Collections');
      },
    },
    {
      id: 'nav-messages',
      label: 'Messages',
      description: 'View messages',
      category: 'navigation',
      keywords: ['chat', 'inbox', 'mail'],
      icon: '💬',
      action: () => {
        setActivePage('messages');
        saveRecentCommand('nav-messages', 'Messages');
      },
    },
    {
      id: 'nav-history',
      label: 'History',
      description: 'View transaction history',
      category: 'navigation',
      keywords: ['transactions', 'past', 'activity'],
      icon: '📜',
      action: () => {
        setActivePage('history');
        saveRecentCommand('nav-history', 'History');
      },
    },
    // Actions
    {
      id: 'action-create-order',
      label: 'Create New Order',
      description: 'Create a new order',
      category: 'actions',
      keywords: ['new', 'buy', 'purchase'],
      icon: '➕',
      action: () => {
        setActivePage('orders');
        saveRecentCommand('action-create-order', 'Create Order');
        // Note: In real implementation, this would trigger order modal
      },
    },
    {
      id: 'action-mint-asset',
      label: 'Mint New Asset',
      description: 'Mint a new NFT asset',
      category: 'actions',
      keywords: ['create', 'nft', 'new'],
      icon: '✨',
      action: () => {
        setActivePage('minting');
        saveRecentCommand('action-mint-asset', 'Mint Asset');
      },
    },
    {
      id: 'action-close-modal',
      label: 'Close Modal',
      description: 'Close the current modal',
      category: 'actions',
      keywords: ['close', 'dismiss', 'cancel'],
      icon: '✕',
      action: () => {
        onCloseModal?.();
        saveRecentCommand('action-close-modal', 'Close Modal');
      },
      shortcut: 'ESC',
    },
    {
      id: 'action-toggle-sidebar',
      label: 'Toggle Sidebar',
      description: 'Collapse or expand sidebar',
      category: 'actions',
      keywords: ['sidebar', 'collapse', 'expand'],
      icon: '↔️',
      action: () => {
        onToggleSidebar?.();
        saveRecentCommand('action-toggle-sidebar', 'Toggle Sidebar');
      },
      shortcut: '⌘B',
    },

    // Settings
    {
      id: 'settings-profile',
      label: 'Profile Settings',
      description: 'Edit your profile settings',
      category: 'settings',
      keywords: ['account', 'preferences', 'edit'],
      icon: '⚙️',
      action: () => {
        setActivePage('profile');
        saveRecentCommand('settings-profile', 'Profile Settings');
      },
    },
    {
      id: 'settings-notifications',
      label: 'Notification Settings',
      description: 'Manage notification preferences',
      category: 'settings',
      keywords: ['alerts', 'preferences'],
      icon: '🔔',
      action: () => {
        setActivePage('profile');
        saveRecentCommand('settings-notifications', 'Notification Settings');
      },
    },
  ].filter(command => isCommandAllowed(command.id)), [setActivePage, onCloseModal, onToggleSidebar, canAccessPage]);

  // Combined search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      // Show recent commands when no search query
      const recent = loadRecentCommands().slice(0, 5);
      return recent.map(r => {
        const command = commands.find(c => c.id === r.commandId);
        return command ? {
          id: r.commandId,
          type: 'command' as const,
          title: r.label,
          subtitle: command.description,
          icon: command.icon,
          action: command.action,
        } : null;
      }).filter(Boolean) as SearchResult[];
    }

    // Search commands
    const commandResults = searchCommands(searchQuery, commands);

    return commandResults.slice(0, 10);
  }, [searchQuery, commands]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          break;
        case 'Enter':
          e.preventDefault();
          if (searchResults[selectedIndex]) {
            searchResults[selectedIndex].action();
            close();
          }
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchResults, selectedIndex]);

  // Reset when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    searchQuery,
    setSearchQuery,
    selectedIndex,
    searchResults,
    open,
    close,
    toggle,
  };
}
