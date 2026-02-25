import { Command, CommandGroup, RecentCommand, SearchResult } from '@/types/command';

const RECENT_COMMANDS_KEY = 'studio_recent_commands';
const MAX_RECENT_COMMANDS = 10;

/**
 * Fuzzy search implementation
 */
export function fuzzyMatch(search: string, text: string): { match: boolean; score: number } {
  search = search.toLowerCase();
  text = text.toLowerCase();

  let searchIndex = 0;
  let textIndex = 0;
  let score = 0;
  let consecutiveMatches = 0;

  while (searchIndex < search.length && textIndex < text.length) {
    if (search[searchIndex] === text[textIndex]) {
      score += 1 + consecutiveMatches * 5; // Bonus for consecutive matches
      consecutiveMatches++;
      searchIndex++;
    } else {
      consecutiveMatches = 0;
    }
    textIndex++;
  }

  const match = searchIndex === search.length;
  const normalizedScore = match ? score / search.length : 0;

  return { match, score: normalizedScore };
}

/**
 * Search commands with fuzzy matching
 */
export function searchCommands(query: string, commands: Command[]): SearchResult[] {
  if (!query.trim()) return [];

  const results: SearchResult[] = [];

  commands.forEach(command => {
    // Search in label
    const labelMatch = fuzzyMatch(query, command.label);
    
    // Search in description
    const descriptionMatch = command.description 
      ? fuzzyMatch(query, command.description)
      : { match: false, score: 0 };
    
    // Search in keywords
    const keywordMatches = command.keywords?.map(kw => fuzzyMatch(query, kw)) || [];
    const bestKeywordMatch = keywordMatches.reduce(
      (best, current) => current.score > best.score ? current : best,
      { match: false, score: 0 }
    );

    // Determine if there's a match
    const hasMatch = labelMatch.match || descriptionMatch.match || bestKeywordMatch.match;
    
    if (hasMatch) {
      // Calculate best score
      const maxScore = Math.max(
        labelMatch.score * 2, // Label matches are more important
        descriptionMatch.score,
        bestKeywordMatch.score
      );

      results.push({
        id: command.id,
        type: 'command',
        title: command.label,
        subtitle: command.description,
        icon: command.icon,
        action: command.action,
        matchScore: maxScore,
      });
    }
  });

  // Sort by score descending
  return results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}

/**
 * Save recent command
 */
export function saveRecentCommand(commandId: string, label: string): void {
  try {
    const recent = loadRecentCommands();
    
    // Remove if already exists
    const filtered = recent.filter(r => r.commandId !== commandId);
    
    // Add to front
    const updated: RecentCommand[] = [
      { commandId, label, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT_COMMANDS);
    
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save recent command:', error);
  }
}

/**
 * Load recent commands
 */
export function loadRecentCommands(): RecentCommand[] {
  try {
    const stored = localStorage.getItem(RECENT_COMMANDS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load recent commands:', error);
    return [];
  }
}

/**
 * Clear recent commands
 */
export function clearRecentCommands(): void {
  try {
    localStorage.removeItem(RECENT_COMMANDS_KEY);
  } catch (error) {
    console.error('Failed to clear recent commands:', error);
  }
}

/**
 * Group commands by category
 */
export function groupCommandsByCategory(commands: Command[]): CommandGroup[] {
  const groups = new Map<string, Command[]>();

  commands.forEach(command => {
    const category = command.category;
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(command);
  });

  const categoryLabels: Record<string, string> = {
    navigation: '🧭 Navigation',
    actions: '⚡ Quick Actions',
    search: '🔍 Search',
    settings: '⚙️ Settings',
    recent: '🕐 Recent',
  };

  return Array.from(groups.entries()).map(([category, cmds]) => ({
    category: category as any,
    label: categoryLabels[category] || category,
    commands: cmds,
  }));
}

/**
 * Highlight matching text
 */
export function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query) return text;

  const parts: { text: string; highlight: boolean }[] = [];
  let lastIndex = 0;
  
  const searchLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  let searchIndex = 0;
  let textIndex = 0;
  
  while (searchIndex < searchLower.length && textIndex < textLower.length) {
    if (searchLower[searchIndex] === textLower[textIndex]) {
      if (lastIndex < textIndex) {
        parts.push({ text: text.slice(lastIndex, textIndex), highlight: false });
      }
      parts.push({ text: text[textIndex], highlight: true });
      lastIndex = textIndex + 1;
      searchIndex++;
    }
    textIndex++;
  }
  
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), highlight: false });
  }
  
  return parts;
}

/**
 * Format keyboard shortcut for display
 */
export function formatShortcut(shortcut: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return shortcut
    .replace(/Command/g, isMac ? '⌘' : 'Ctrl')
    .replace(/Shift/g, '⇧')
    .replace(/Alt/g, isMac ? '⌥' : 'Alt')
    .replace(/Ctrl/g, isMac ? '⌃' : 'Ctrl');
}
