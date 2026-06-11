#!/usr/bin/env node

import {
  createPublicClient,
  encodeAbiParameters,
  http,
  keccak256,
  parseAbi,
  stringToHex,
  zeroHash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bscTestnet } from 'viem/chains';

const DEFAULT_RPC_URL = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/';
const EXPECTED_CHAIN_ID = 97;
const AI_WALLET_FACTORY_V2 = '0xD838268fa8dF6AFD1Fd79D9C0Fd243A3D23D0441';
const DELEGATION_MANAGER = '0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13';
const MARKETPLACE = '0x18E1C8ab257FAf16Ec8257A9715d07661194150B';
const PAYMENT_GATEWAY = '0x082d75D8cA96C6e97B6b451Ad4857454A53D5C15';
const PAYMENT_TOKEN_USDT = '0x337610d27c682e347c9cd60bd4b3b107c9d34ddd';
const COUNTERPARTY = '0x0000000000000000000000000000000000000001';
const NO_EXPIRY_UINT64 = (2n ** 64n) - 1n;
const FACTORY_ROLE = keccak256(stringToHex('FACTORY_ROLE'));
const NONZERO_COUNTERPARTY_HASH = keccak256(
  encodeAbiParameters([{ type: 'address' }], [COUNTERPARTY]),
);

const ACTIONS = {
  BUY_CREATE_ORDER: 1n << 0n,
  BUY_PAY_ORDER: 1n << 1n,
  SELL_MINT_ASSET: 1n << 2n,
  SELLER_CONFIRM: 1n << 3n,
};

const FACTORY_ABI = parseAbi([
  'function FACTORY_VERSION() view returns (uint256)',
  'function delegationManager() view returns (address)',
  'function deployWallet((address root,address delegate,address allowedTarget,address allowedSpender,address allowedToken,uint64 expiry,uint256 actionMask,uint256 maxPerOrder,uint256 maxTotal,bytes32 counterpartyAllowlistHash,bool restrictAssetId,uint256 assetId,uint256 maxAmount,uint256 minGrossPrice,uint256 maxGrossPrice,uint256 maxDeliverySeconds) config) returns (address wallet,uint256 sessionNonce,bytes32 sessionId)',
  'error InvalidNoExpiryPolicy()',
]);

const DELEGATION_MANAGER_ABI = parseAbi([
  'function hasActiveCycle(address root) view returns (bool)',
  'function hasRole(bytes32 role,address account) view returns (bool)',
]);

function parseArgs(argv) {
  const options = {
    rpcUrl: process.env.BSC_TESTNET_RPC_URL || process.env.RPC_URL || DEFAULT_RPC_URL,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--rpc-url') options.rpcUrl = String(argv[++index] || '').trim();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function buildDeploymentConfig(root, actionMask, counterpartyAllowlistHash) {
  const includesBuyAuthority = (actionMask & (ACTIONS.BUY_CREATE_ORDER | ACTIONS.BUY_PAY_ORDER)) !== 0n;
  const includesMint = (actionMask & ACTIONS.SELL_MINT_ASSET) !== 0n;
  const includesSellerConfirm = (actionMask & ACTIONS.SELLER_CONFIRM) !== 0n;

  return {
    root,
    delegate: '0x000000000000000000000000000000000000dEaD',
    allowedTarget: MARKETPLACE,
    allowedSpender: PAYMENT_GATEWAY,
    allowedToken: PAYMENT_TOKEN_USDT,
    expiry: NO_EXPIRY_UINT64,
    actionMask,
    maxPerOrder: includesBuyAuthority ? 10n : 0n,
    maxTotal: includesBuyAuthority ? 100n : 0n,
    counterpartyAllowlistHash,
    restrictAssetId: false,
    assetId: 0n,
    maxAmount: includesMint ? 1000n : 0n,
    minGrossPrice: includesSellerConfirm ? 1n : 0n,
    maxGrossPrice: includesBuyAuthority ? 10n : 0n,
    maxDeliverySeconds: includesBuyAuthority || includesSellerConfirm ? 10n * 24n * 60n * 60n : 0n,
  };
}

function getContractErrorName(error) {
  return error?.cause?.data?.errorName || error?.data?.errorName || null;
}

function getErrorMessage(error) {
  return error?.shortMessage || error?.cause?.shortMessage || error?.message || String(error);
}

async function simulateNoExpiryCase(publicClient, account, testCase) {
  try {
    await publicClient.simulateContract({
      account,
      address: AI_WALLET_FACTORY_V2,
      abi: FACTORY_ABI,
      functionName: 'deployWallet',
      args: [
        buildDeploymentConfig(
          account.address,
          testCase.actionMask,
          testCase.counterpartyAllowlistHash,
        ),
      ],
    });
    return { ok: true, errorName: null };
  } catch (error) {
    return {
      ok: false,
      errorName: getContractErrorName(error),
      message: getErrorMessage(error),
    };
  }
}

async function readPreflight(publicClient, account) {
  const [chainId, factoryVersion, delegationManager, factoryHasRole, rootHasActiveCycle] = await Promise.all([
    publicClient.getChainId(),
    publicClient.readContract({
      address: AI_WALLET_FACTORY_V2,
      abi: FACTORY_ABI,
      functionName: 'FACTORY_VERSION',
    }),
    publicClient.readContract({
      address: AI_WALLET_FACTORY_V2,
      abi: FACTORY_ABI,
      functionName: 'delegationManager',
    }),
    publicClient.readContract({
      address: DELEGATION_MANAGER,
      abi: DELEGATION_MANAGER_ABI,
      functionName: 'hasRole',
      args: [FACTORY_ROLE, AI_WALLET_FACTORY_V2],
    }),
    publicClient.readContract({
      address: DELEGATION_MANAGER,
      abi: DELEGATION_MANAGER_ABI,
      functionName: 'hasActiveCycle',
      args: [account.address],
    }),
  ]);

  return {
    chainId,
    expectedChainId: EXPECTED_CHAIN_ID,
    factoryVersion: factoryVersion.toString(),
    factory: AI_WALLET_FACTORY_V2,
    delegationManager,
    expectedDelegationManager: DELEGATION_MANAGER,
    factoryHasFactoryRole: factoryHasRole,
    simulationRoot: account.address,
    simulationRootHasActiveCycle: rootHasActiveCycle,
  };
}

function assertPreflight(preflight) {
  const failures = [];
  if (preflight.chainId !== EXPECTED_CHAIN_ID) {
    failures.push(`chain id ${preflight.chainId} != expected ${EXPECTED_CHAIN_ID}`);
  }
  if (preflight.delegationManager.toLowerCase() !== DELEGATION_MANAGER.toLowerCase()) {
    failures.push(`factory delegationManager ${preflight.delegationManager} != expected ${DELEGATION_MANAGER}`);
  }
  if (!preflight.factoryHasFactoryRole) {
    failures.push('AIWalletFactoryV2 does not have FACTORY_ROLE on DelegationManager');
  }
  if (preflight.simulationRootHasActiveCycle) {
    failures.push('simulation root already has an active cycle');
  }
  return failures;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const publicClient = createPublicClient({
    chain: bscTestnet,
    transport: http(options.rpcUrl),
  });
  const account = privateKeyToAccount('0x3000000000000000000000000000000000000000000000000000000000000097');
  const preflight = await readPreflight(publicClient, account);
  const preflightFailures = assertPreflight(preflight);
  if (preflightFailures.length > 0) {
    console.log(JSON.stringify({
      ok: false,
      invariant: 'NO_EXPIRY + zeroHash is allowed for SELL_MINT_ASSET only; buyer authority and SELLER_CONFIRM require counterparty binding.',
      preflight,
      preflightFailures,
      results: [],
    }, null, 2));
    process.exit(1);
  }

  const cases = [
    {
      name: 'BUY_CREATE_ORDER zeroHash is rejected',
      actionMask: ACTIONS.BUY_CREATE_ORDER,
      counterpartyAllowlistHash: zeroHash,
      expectedOk: false,
      expectedErrorName: 'InvalidNoExpiryPolicy',
    },
    {
      name: 'BUY_PAY_ORDER zeroHash is rejected',
      actionMask: ACTIONS.BUY_PAY_ORDER,
      counterpartyAllowlistHash: zeroHash,
      expectedOk: false,
      expectedErrorName: 'InvalidNoExpiryPolicy',
    },
    {
      name: 'SELLER_CONFIRM zeroHash is rejected',
      actionMask: ACTIONS.SELLER_CONFIRM,
      counterpartyAllowlistHash: zeroHash,
      expectedOk: false,
      expectedErrorName: 'InvalidNoExpiryPolicy',
    },
    {
      name: 'SELL_MINT_ASSET zeroHash is allowed',
      actionMask: ACTIONS.SELL_MINT_ASSET,
      counterpartyAllowlistHash: zeroHash,
      expectedOk: true,
      expectedErrorName: null,
    },
    {
      name: 'BUY_CREATE_ORDER nonzeroHash is allowed',
      actionMask: ACTIONS.BUY_CREATE_ORDER,
      counterpartyAllowlistHash: NONZERO_COUNTERPARTY_HASH,
      expectedOk: true,
      expectedErrorName: null,
    },
    {
      name: 'BUY_PAY_ORDER nonzeroHash is allowed',
      actionMask: ACTIONS.BUY_PAY_ORDER,
      counterpartyAllowlistHash: NONZERO_COUNTERPARTY_HASH,
      expectedOk: true,
      expectedErrorName: null,
    },
    {
      name: 'SELLER_CONFIRM nonzeroHash is allowed',
      actionMask: ACTIONS.SELLER_CONFIRM,
      counterpartyAllowlistHash: NONZERO_COUNTERPARTY_HASH,
      expectedOk: true,
      expectedErrorName: null,
    },
    {
      name: 'SELL_MINT_ASSET plus BUY_CREATE_ORDER zeroHash is rejected',
      actionMask: ACTIONS.SELL_MINT_ASSET | ACTIONS.BUY_CREATE_ORDER,
      counterpartyAllowlistHash: zeroHash,
      expectedOk: false,
      expectedErrorName: 'InvalidNoExpiryPolicy',
    },
  ];

  const results = [];
  for (const testCase of cases) {
    const actual = await simulateNoExpiryCase(publicClient, account, testCase);
    const passed = actual.ok === testCase.expectedOk
      && (!testCase.expectedErrorName || actual.errorName === testCase.expectedErrorName);
    results.push({
      name: testCase.name,
      actionMask: testCase.actionMask.toString(),
      counterpartyAllowlistHash: testCase.counterpartyAllowlistHash,
      expectedOk: testCase.expectedOk,
      actualOk: actual.ok,
      expectedErrorName: testCase.expectedErrorName,
      actualErrorName: actual.errorName,
      message: actual.message || null,
      passed,
    });
  }

  const failed = results.filter((result) => !result.passed);
  console.log(JSON.stringify({
    ok: failed.length === 0,
    invariant: 'NO_EXPIRY + zeroHash is allowed for SELL_MINT_ASSET only; buyer authority and SELLER_CONFIRM require counterparty binding.',
    preflight,
    nonzeroCounterpartyHash: NONZERO_COUNTERPARTY_HASH,
    results,
  }, null, 2));

  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error?.message || String(error),
  }, null, 2));
  process.exit(1);
});
