import { describe, expect, it } from 'vitest';
import {
  ARBITRUM_SEPOLIA_CONTRACTS,
  AVALANCHE_FUJI_CONTRACTS,
  BASE_SEPOLIA_CONTRACTS,
  CONTRACTS,
  ETHEREUM_SEPOLIA_CONTRACTS,
  OPTIMISM_SEPOLIA_CONTRACTS,
  WORLDCHAIN_SEPOLIA_CONTRACTS,
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
  it('marks BSC Testnet, Base Sepolia, Arbitrum Sepolia, Ethereum Sepolia, Optimism Sepolia, Avalanche Fuji, and World Chain Sepolia as write-enabled', () => {
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

    expect(getProtocolNetworkOption(11155111)).toMatchObject({
      key: 'ethereum-sepolia',
      status: 'live',
    });
    expect(getProtocolContracts(11155111)).toBe(ETHEREUM_SEPOLIA_CONTRACTS);
    expect(isProtocolNetworkWriteEnabled(11155111)).toBe(true);

    expect(getProtocolNetworkOption(11155420)).toMatchObject({
      key: 'optimism-sepolia',
      status: 'live',
    });
    expect(getProtocolContracts(11155420)).toBe(OPTIMISM_SEPOLIA_CONTRACTS);
    expect(isProtocolNetworkWriteEnabled(11155420)).toBe(true);

    expect(getProtocolNetworkOption(43113)).toMatchObject({
      key: 'avalanche-fuji',
      status: 'live',
    });
    expect(getProtocolContracts(43113)).toBe(AVALANCHE_FUJI_CONTRACTS);
    expect(isProtocolNetworkWriteEnabled(43113)).toBe(true);

    expect(getProtocolNetworkOption(4801)).toMatchObject({
      key: 'worldchain-sepolia',
      status: 'live',
    });
    expect(getProtocolContracts(4801)).toBe(WORLDCHAIN_SEPOLIA_CONTRACTS);
    expect(isProtocolNetworkWriteEnabled(4801)).toBe(true);
  });

  it('resolves aliases and restores live persisted networks', () => {
    expect(findProtocolNetworkOptionByValue('arb sepolia')?.key).toBe('arbitrum-sepolia');
    expect(findProtocolNetworkOptionByValue('base testnet')?.key).toBe('base-sepolia');
    expect(findProtocolNetworkOptionByValue('eth sepolia')?.key).toBe('ethereum-sepolia');
    expect(findProtocolNetworkOptionByValue('op sepolia')?.key).toBe('optimism-sepolia');
    expect(findProtocolNetworkOptionByValue('fuji')?.key).toBe('avalanche-fuji');
    expect(findProtocolNetworkOptionByValue('world sepolia')?.key).toBe('worldchain-sepolia');

    expect(resolveStoredProtocolNetworkKey('base-sepolia')).toBe('base-sepolia');
    expect(resolveStoredProtocolNetworkKey('arbitrum-sepolia')).toBe('arbitrum-sepolia');
    expect(resolveStoredProtocolNetworkKey('ethereum-sepolia')).toBe('ethereum-sepolia');
    expect(resolveStoredProtocolNetworkKey('optimism-sepolia')).toBe('optimism-sepolia');
    expect(resolveStoredProtocolNetworkKey('avalanche-fuji')).toBe('avalanche-fuji');
    expect(resolveStoredProtocolNetworkKey('worldchain-sepolia')).toBe('worldchain-sepolia');
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

  it('uses Ethereum Sepolia token and M2M addresses without mutating other networks', () => {
    const ethereumTokens = getPaymentTokens(11155111);

    expect(ethereumTokens.USDT).toBe('0x11E6c8f2806b32dAC427E7Df07F67602647eF87A');
    expect(ethereumTokens.USDC).toBe('0xD6E84789741Ea2DE727961cCB383454E4A845035');
    expect(getPaymentTokenSymbolByAddress(ethereumTokens.USDT, 11155111)).toBe('USDT');
    expect(getM2MContracts(11155111)).toEqual({
      DELEGATION_MANAGER: ETHEREUM_SEPOLIA_CONTRACTS.DELEGATION_MANAGER,
      AI_WALLET_FACTORY_V2: ETHEREUM_SEPOLIA_CONTRACTS.AI_WALLET_FACTORY_V2,
    });
  });

  it('uses Optimism Sepolia token and M2M addresses without mutating other networks', () => {
    const optimismTokens = getPaymentTokens(11155420);

    expect(optimismTokens.USDT).toBe('0x11E6c8f2806b32dAC427E7Df07F67602647eF87A');
    expect(optimismTokens.USDC).toBe('0xD6E84789741Ea2DE727961cCB383454E4A845035');
    expect(getPaymentTokenSymbolByAddress(optimismTokens.USDT, 11155420)).toBe('USDT');
    expect(getM2MContracts(11155420)).toEqual({
      DELEGATION_MANAGER: OPTIMISM_SEPOLIA_CONTRACTS.DELEGATION_MANAGER,
      AI_WALLET_FACTORY_V2: OPTIMISM_SEPOLIA_CONTRACTS.AI_WALLET_FACTORY_V2,
    });
  });

  it('uses Avalanche Fuji token and M2M addresses without mutating other networks', () => {
    const fujiTokens = getPaymentTokens(43113);

    expect(fujiTokens.USDT).toBe('0x11E6c8f2806b32dAC427E7Df07F67602647eF87A');
    expect(fujiTokens.USDC).toBe('0xD6E84789741Ea2DE727961cCB383454E4A845035');
    expect(getPaymentTokenSymbolByAddress(fujiTokens.USDT, 43113)).toBe('USDT');
    expect(getM2MContracts(43113)).toEqual({
      DELEGATION_MANAGER: AVALANCHE_FUJI_CONTRACTS.DELEGATION_MANAGER,
      AI_WALLET_FACTORY_V2: AVALANCHE_FUJI_CONTRACTS.AI_WALLET_FACTORY_V2,
    });
  });

  it('uses World Chain Sepolia token and active M2M addresses without mutating other networks', () => {
    const worldTokens = getPaymentTokens(4801);

    expect(worldTokens.USDT).toBe('0x11E6c8f2806b32dAC427E7Df07F67602647eF87A');
    expect(worldTokens.USDC).toBe('0xD6E84789741Ea2DE727961cCB383454E4A845035');
    expect(getPaymentTokenSymbolByAddress(worldTokens.USDT, 4801)).toBe('USDT');
    expect(getM2MContracts(4801)).toEqual({
      DELEGATION_MANAGER: WORLDCHAIN_SEPOLIA_CONTRACTS.DELEGATION_MANAGER,
      AI_WALLET_FACTORY_V2: WORLDCHAIN_SEPOLIA_CONTRACTS.AI_WALLET_FACTORY_V2,
    });
    expect(getM2MContracts(4801).DELEGATION_MANAGER).toBe('0x5e41f1155AB4E614037C9C481BB8c1d398915cd0');
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

    const ethereumKit = getTestnetStarterKit(11155111);
    expect(ethereumKit).toMatchObject({
      networkKey: 'ethereum-sepolia',
      nativeTokenLabel: 'ETH',
      faucetAddress: '0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F',
    });
    expect(isTestnetStarterKitConfigured(ethereumKit)).toBe(true);

    const optimismKit = getTestnetStarterKit(11155420);
    expect(optimismKit).toMatchObject({
      networkKey: 'optimism-sepolia',
      nativeTokenLabel: 'ETH',
      faucetAddress: '0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F',
    });
    expect(isTestnetStarterKitConfigured(optimismKit)).toBe(true);

    const avalancheFujiKit = getTestnetStarterKit(43113);
    expect(avalancheFujiKit).toMatchObject({
      networkKey: 'avalanche-fuji',
      nativeTokenLabel: 'AVAX',
      faucetAddress: '0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F',
    });
    expect(isTestnetStarterKitConfigured(avalancheFujiKit)).toBe(true);

    const worldchainSepoliaKit = getTestnetStarterKit(4801);
    expect(worldchainSepoliaKit).toMatchObject({
      networkKey: 'worldchain-sepolia',
      nativeTokenLabel: 'ETH',
      faucetAddress: '0xbbD53C18F4d9fb98AA6c4837ea0E8F221e1b5F0F',
    });
    expect(isTestnetStarterKitConfigured(worldchainSepoliaKit)).toBe(true);

    expect(getTestnetStarterKit(8453)).toBeNull();
  });
});
