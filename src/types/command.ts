/**
 * Command types for Command Palette (⌘K)
 */

export type CommandCategory = 'navigation' | 'actions' | 'search' | 'settings' | 'recent';

export interface Command {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  keywords?: string[];
  icon?: string;
  action: () => void;
  shortcut?: string;
}

export interface CommandGroup {
  category: CommandCategory;
  label: string;
  commands: Command[];
}

export interface RecentCommand {
  commandId: string;
  timestamp: number;
  label: string;
}

export interface SearchResult {
  id: string;
  type: 'asset' | 'user' | 'page' | 'command';
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  action: () => void;
  matchScore?: number;
}

export interface CommandPaletteState {
  isOpen: boolean;
  searchQuery: string;
  selectedIndex: number;
  results: SearchResult[];
  recentCommands: RecentCommand[];
}
