import { describe, expect, it } from 'vitest';
import {
  ARBITRUM_SEPOLIA_CONTRACTS,
  BASE_SEPOLIA_CONTRACTS,
  CONTRACTS,
  getPaymentTokenSymbolByAddress,
  getPaymentTokens,
  resolvePaymentTokenForCurrency,
} from '@/config/contracts';
import { getM2MContracts, getM2MDefaultPaymentToken } from '@/config/m2m';
import {
  getTestnetStarterKit,
  isTestnetStarterKitConfigured,
} from '@/config/testnetFaucet';
import {
  findProtocolNetworkOptionByValue,
  getProtocolContracts,
  getProtocolNetworkOption,
  isProtocolNetworkWriteEnabled,
  resolveStoredProtocolNetworkKey,
} from '@/utils/protocolNetwork';

describe('protocol network registry', () => {
  it('marks BSC Testnet, Base Sepolia, and Arbitrum Sepolia as write-enabled', () => {
    expect(getProtocolNetworkOption(97)).toMatchObject({
      key: 'bnb-testnet',
      status: 'live',
    });
    expect(getProtocolContracts(97)).toBe(CONTRACTS);
    expect(isProtocolNetworkWriteEnabled(97)).toBe(true);

    expect(getProtocolNetworkOption(84532)).toMatchObject({
      key: 'base-sepolia',
      status: 'live',
    });
    expect(getProtocolContracts(84532)).toBe(BASE_SEPOLIA_CONTRACTS);
    expect(isProtocolNetworkWriteEnabled(84532)).toBe(true);

    expect(getProtocolNetworkOption(421614)).toMatchObject({
      key: 'arbitrum-sepolia',
      status: 'live',
    });
    expect(getProtocolContracts(421614)).toBe(ARBITRUM_SEPOLIA_CONTRACTS);
    expect(isProtocolNetworkWriteEnabled(421614)).toBe(true);
  });

  it('resolves aliases and restores live persisted networks', () => {
    expect(findProtocolNetworkOptionByValue('arb sepolia')?.key).toBe('arbitrum-sepolia');
    expect(findProtocolNetworkOptionByValue('base testnet')?.key).toBe('base-sepolia');

    expect(resolveStoredProtocolNetworkKey('base-sepolia')).toBe('base-sepolia');
    expect(resolveStoredProtocolNetworkKey('arbitrum-sepolia')).toBe('arbitrum-sepolia');
  });
});

describe('chain-scoped payment tokens and M2M contracts', () => {
  it('uses Base Sepolia token and M2M addresses without mutating the BSC defaults', () => {
    const bscTokens = getPaymentTokens(97);
    const baseTokens = getPaymentTokens(84532);

    expect(baseTokens.USDT).toBe('0x11E6c8f2806b32DaC427E7dF07F67602647Ef87a');
    expect(baseTokens.USDC).toBe('0xd6e84789741ea2DE727961CCB383454e4A845035');
    expect(baseTokens.WBNB).toBe('0x0000000000000000000000000000000000000000');
    expect(bscTokens.WBNB).toBe('0xae13d989dac2f0debff460ac112a837c89baa7cd');

    expect(resolvePaymentTokenForCurrency('BNB', 97)).toEqual({
      symbol: 'WBNB',
      address: bscTokens.WBNB,
    });
    expect(resolvePaymentTokenForCurrency('BNB', 84532)).toEqual({
      symbol: 'USDC',
      address: baseTokens.USDC,
    });
    expect(getPaymentTokenSymbolByAddress(baseTokens.USDT, 84532)).toBe('USDT');

    expect(getM2MContracts(84532)).toEqual({
      DELEGATION_MANAGER: BASE_SEPOLIA_CONTRACTS.DELEGATION_MANAGER,
      AI_WALLET_FACTORY_V2: BASE_SEPOLIA_CONTRACTS.AI_WALLET_FACTORY_V2,
    });
    expect(getM2MDefaultPaymentToken(84532, baseTokens)).toBe(baseTokens.USDT);
  });

  it('uses Arbitrum Sepolia token and M2M addresses without mutating other networks', () => {
    const arbitrumTokens = getPaymentTokens(421614);

    expect(arbitrumTokens.USDT).toBe('0x279c62C97c6967d0E0F45f9D2460d38E3929c090');
    expect(arbitrumTokens.USDC).toBe('0x233Fb28c8166807b01DcBE2743bb85cF7cdC8b41');
    expect(getM2MContracts(421614)).toEqual({
      DELEGATION_MANAGER: ARBITRUM_SEPOLIA_CONTRACTS.DELEGATION_MANAGER,
      AI_WALLET_FACTORY_V2: ARBITRUM_SEPOLIA_CONTRACTS.AI_WALLET_FACTORY_V2,
    });
  });
});

describe('testnet starter kit registry', () => {
  it('provides starter-kit metadata per operated testnet', () => {
    expect(getTestnetStarterKit(97)).toMatchObject({
      networkKey: 'bnb-testnet',
      nativeTokenLabel: 'tBNB',
    });

    expect(getTestnetStarterKit(84532)).toMatchObject({
      networkKey: 'base-sepolia',
      nativeTokenLabel: 'ETH',
      faucetAddress: '0xbBd53C18F4d9fb98aA6c4837Ea0E8F221E1B5F0F',
    });

    const arbitrumKit = getTestnetStarterKit(421614);
    expect(arbitrumKit).toMatchObject({
      networkKey: 'arbitrum-sepolia',
      nativeTokenLabel: 'ETH',
      faucetAddress: '0xFA37557E4F6D066f6CF4B69BA865837d007c8D1e',
    });
    expect(isTestnetStarterKitConfigured(arbitrumKit)).toBe(true);

    expect(getTestnetStarterKit(8453)).toBeNull();
  });
});
