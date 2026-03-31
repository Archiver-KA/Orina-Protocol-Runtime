/**
 * Avatar utility functions for Orina
 */

/**
 * Format wallet address to short format (0x742d...9c4F)
 * @param address - Full wallet address
 * @returns Formatted address with first 4 hex chars and last 4 chars
 */
export function formatWalletAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 10) return address;
  
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Available avatar types matching Figma imports
 */
export const AVATAR_TYPES = [
  'avatar1',
  'avatar2',
  'avatar6',
  'avatar14',
  'avatar17',
  'avatar18',
  'avatar19',
  'avatar20',
] as const;

export type AvatarType = typeof AVATAR_TYPES[number];

/**
 * Get a random avatar type
 * @returns Random avatar type from available avatars
 */
export function getRandomAvatarType(): AvatarType {
  const randomIndex = Math.floor(Math.random() * AVATAR_TYPES.length);
  return AVATAR_TYPES[randomIndex];
}

/**
 * Get a deterministic avatar type based on wallet address
 * This ensures the same wallet always gets the same default avatar
 * UNLESS there's a random seed stored (from profile reset)
 * @param address - Wallet address
 * @returns Avatar type
 */
export function getAvatarTypeForAddress(address: string): AvatarType {
  if (!address) return getRandomAvatarType();
  
  // Check if there's a random seed for this address (from profile reset)
  const seedKey = `orina_avatar_seed_${address.toLowerCase()}`;
  const storedSeed = sessionStorage.getItem(seedKey);
  
  if (storedSeed) {
    // Use the stored random seed
    const seed = parseInt(storedSeed, 10);
    const index = seed % AVATAR_TYPES.length;
    return AVATAR_TYPES[index];
  }
  
  // Use the wallet address to generate a deterministic index
  const hash = address.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  const index = hash % AVATAR_TYPES.length;
  return AVATAR_TYPES[index];
}

/**
 * Generate and store a random avatar seed for an address
 * This allows the avatar to change when profile is reset
 * @param address - Wallet address
 */
export function generateRandomAvatarSeed(address: string): void {
  const seedKey = `orina_avatar_seed_${address.toLowerCase()}`;
  const randomSeed = Math.floor(Math.random() * 1000000);
  sessionStorage.setItem(seedKey, randomSeed.toString());
  console.log(`[Avatar] Generated random seed ${randomSeed} for ${address}`);
}

/**
 * Get default username for a wallet address
 * @param address - Wallet address
 * @returns Handle-like username derived from wallet address
 */
export function getDefaultUsername(address: string): string {
  if (!address) return '';
  return `@${address.slice(2, 10)}`;
}
