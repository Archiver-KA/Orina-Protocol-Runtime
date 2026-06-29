import { createPublicClient, http, keccak256, parseAbi, toBytes } from 'viem';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_BYTES32 = `0x${'0'.repeat(64)}`;

const ROLES = {
  DEFAULT_ADMIN_ROLE: ZERO_BYTES32,
  PROPOSER_ROLE: keccak256(toBytes('PROPOSER_ROLE')),
  EXECUTOR_ROLE: keccak256(toBytes('EXECUTOR_ROLE')),
  CANCELLER_ROLE: keccak256(toBytes('CANCELLER_ROLE')),
};

const EXPECTED_RUNTIME_VERSIONS = {
  marketplace: '3.4',
  paymentGateway: '3.5',
  feeManager: '3.5',
};

const NETWORKS = [
  {
    key: 'bnb-testnet',
    label: 'BNB Chain Testnet',
    chainId: 97,
    status: 'live',
    rpcUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/',
    marketplace: '0x18E1C8ab257FAf16Ec8257A9715d07661194150B',
    paymentGateway: '0x082d75D8cA96C6e97B6b451Ad4857454A53D5C15',
    feeManager: '0xD32fc966835D8eb7D26A12BEcCa86c749A60eFb3',
    delegationManager: '0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13',
    aiWalletFactoryV2: '0xD838268fa8dF6AFD1Fd79D9C0Fd243A3D23D0441',
    timelock: '0x5452CE749EDA1bE82132743AA224e7C86023A7F4',
    faucet: '0x6527262782C140e0A4724bef06431786556AfDE0',
    expectedVersions: EXPECTED_RUNTIME_VERSIONS,
    tokens: [
      {
        key: 'USDT.t',
        address: '0x8800279B4a5528628ef069698169C58B89377809',
        symbol: 'USDT.t',
        decimals: 6,
      },
      {
        key: 'USDC.t',
        address: '0xbdcA834A71F5BFF1420eb5D1B0491d58a33141E5',
        symbol: 'USDC.t',
        decimals: 6,
      },
    ],
  },
  {
    key: 'base-sepolia',
    label: 'Base Sepolia',
    chainId: 84532,
    status: 'live',
    rpcUrl: 'https://sepolia.base.org',
    marketplace: '0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14',
    paymentGateway: '0x1A880Ae46993282dd77C2dDCc5e36498eB616C92',
    feeManager: '0x51aB383A43d79f4127B7E7dCBcd892164FA2838F',
    delegationManager: '0xFC0038B7CC628966f8a7f14414c9386c2d6cB288',
    aiWalletFactoryV2: '0x0E5E106A7F81233Fe07115Aeb3777e847adB09cB',
    timelock: '0x989b893118237f710b7Efc8820147B61c68DcaEE',
    faucet: '0xbBd53C18F4d9fb98aA6c4837Ea0E8F221E1B5F0F',
    expectedVersions: EXPECTED_RUNTIME_VERSIONS,
    tokens: [
      {
        key: 'ORI',
        address: '0xD87493f4C02aad2c67Ce12aa534d188Bf44FCcAB',
        symbol: 'ORI',
        decimals: 18,
      },
      {
        key: 'USDT.t',
        address: '0x11E6c8f2806b32dAC427E7Df07F67602647eF87A',
        symbol: 'USDT.t',
        decimals: 6,
      },
      {
        key: 'USDC.t',
        address: '0xD6E84789741Ea2DE727961cCB383454E4A845035',
        symbol: 'USDC.t',
        decimals: 6,
      },
    ],
  },
  {
    key: 'arbitrum-sepolia',
    label: 'Arbitrum Sepolia',
    chainId: 421614,
    status: 'live',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    marketplace: '0x5863f25A8250EBe20Bd1E3d04FD796081Fc3D72E',
    paymentGateway: '0x39F539903b75A0bF0FEF16a443904C8c9DF787EE',
    feeManager: '0x0c4AccB88E2Cc530FEFBAb31Ca77371a2a68Ba20',
    delegationManager: '0x56D454f55D5d05b060777F70e653BbBEb1167D2e',
    aiWalletFactoryV2: '0x143519194A9Df4678b602BEE329C1A96381d1CBD',
    timelock: '0x66Bf76Fdf268976080f119278982B082f417FbAD',
    faucet: '0xFA37557E4F6D066f6CF4B69BA865837d007c8D1e',
    expectedVersions: EXPECTED_RUNTIME_VERSIONS,
    tokens: [
      {
        key: 'ORI',
        address: '0x5e41f1155AB4E614037C9C481BB8c1d398915cd0',
        symbol: 'ORI',
        decimals: 18,
      },
      {
        key: 'USDT.t',
        address: '0x279c62C97c6967d0E0F45f9D2460d38E3929c090',
        symbol: 'USDT.t',
        decimals: 6,
      },
      {
        key: 'USDC.t',
        address: '0x233Fb28c8166807b01DcBE2743bb85cF7cdC8b41',
        symbol: 'USDC.t',
        decimals: 6,
      },
    ],
    expectedGovernance: {
      operator: '0x282Be18838D7079C215F49749a9606d77e00888b',
      timelockMinDelaySeconds: '0',
      openExecutor: false,
      note: 'Arbitrum Sepolia is EOA-operated through a zero-delay timelock for testnet only.',
    },
  },
];

const VERSION_ABI = parseAbi(['function VERSION() view returns (string)']);

const MARKETPLACE_ABI = parseAbi([
  'function VERSION() view returns (string)',
  'function delegationManager() view returns (address)',
  'function GOVERNANCE_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
]);

const DELEGATION_MANAGER_ABI = parseAbi([
  'function CONSUMER_ROLE() view returns (bytes32)',
  'function FACTORY_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
]);

const TIMELOCK_ABI = parseAbi([
  'function getMinDelay() view returns (uint256)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
]);

const ERC20_ABI = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
]);

function hasBytecode(code) {
  return Boolean(code && code !== '0x');
}

function sameAddress(left, right) {
  return String(left || '').toLowerCase() === String(right || '').toLowerCase();
}

function getBytecodeTargets(network) {
  const targets = {
    marketplace: network.marketplace,
    paymentGateway: network.paymentGateway,
    feeManager: network.feeManager,
    delegationManager: network.delegationManager,
    aiWalletFactoryV2: network.aiWalletFactoryV2,
    timelock: network.timelock,
    faucet: network.faucet,
  };

  for (const token of network.tokens ?? []) {
    targets[`token:${token.key}`] = token.address;
  }

  return Object.fromEntries(Object.entries(targets).filter(([, address]) => Boolean(address)));
}

async function checkBytecode(client, network) {
  const entries = await Promise.all(
    Object.entries(getBytecodeTargets(network)).map(async ([key, address]) => {
      const code = await client.getCode({ address });
      return [key, hasBytecode(code)];
    }),
  );

  return Object.fromEntries(entries);
}

async function checkVersions(client, network) {
  const checks = {};

  for (const [contractKey, expected] of Object.entries(network.expectedVersions ?? {})) {
    const address = network[contractKey];
    if (!address) continue;

    const abi = contractKey === 'marketplace' ? MARKETPLACE_ABI : VERSION_ABI;
    const actual = await client.readContract({
      address,
      abi,
      functionName: 'VERSION',
    });

    checks[contractKey] = {
      actual,
      expected,
      ok: actual === expected,
    };
  }

  return checks;
}

async function checkTokens(client, network) {
  return Promise.all(
    (network.tokens ?? []).map(async (token) => {
      const [actualSymbol, actualDecimals] = await Promise.all([
        client.readContract({
          address: token.address,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }),
        client.readContract({
          address: token.address,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
      ]);

      return {
        key: token.key,
        address: token.address,
        actualSymbol,
        expectedSymbol: token.symbol,
        actualDecimals: Number(actualDecimals),
        expectedDecimals: token.decimals,
        ok: actualSymbol === token.symbol && Number(actualDecimals) === token.decimals,
      };
    }),
  );
}

async function checkGovernance(client, network) {
  const expected = network.expectedGovernance;
  if (!expected) return undefined;

  const [governanceRole, consumerRole, factoryRole] = await Promise.all([
    client.readContract({
      address: network.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: 'GOVERNANCE_ROLE',
    }),
    client.readContract({
      address: network.delegationManager,
      abi: DELEGATION_MANAGER_ABI,
      functionName: 'CONSUMER_ROLE',
    }),
    client.readContract({
      address: network.delegationManager,
      abi: DELEGATION_MANAGER_ABI,
      functionName: 'FACTORY_ROLE',
    }),
  ]);

  const [
    minDelay,
    marketplaceTimelockGovernance,
    marketplaceOperatorGovernance,
    marketplaceOperatorAdmin,
    delegationMarketplaceConsumer,
    delegationFactoryRole,
    delegationTimelockAdmin,
    delegationOperatorAdmin,
    timelockOperatorAdmin,
    timelockOperatorProposer,
    timelockOperatorExecutor,
    timelockOperatorCanceller,
    timelockOpenExecutor,
  ] = await Promise.all([
    client.readContract({
      address: network.timelock,
      abi: TIMELOCK_ABI,
      functionName: 'getMinDelay',
    }),
    client.readContract({
      address: network.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: 'hasRole',
      args: [governanceRole, network.timelock],
    }),
    client.readContract({
      address: network.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: 'hasRole',
      args: [governanceRole, expected.operator],
    }),
    client.readContract({
      address: network.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: 'hasRole',
      args: [ROLES.DEFAULT_ADMIN_ROLE, expected.operator],
    }),
    client.readContract({
      address: network.delegationManager,
      abi: DELEGATION_MANAGER_ABI,
      functionName: 'hasRole',
      args: [consumerRole, network.marketplace],
    }),
    client.readContract({
      address: network.delegationManager,
      abi: DELEGATION_MANAGER_ABI,
      functionName: 'hasRole',
      args: [factoryRole, network.aiWalletFactoryV2],
    }),
    client.readContract({
      address: network.delegationManager,
      abi: DELEGATION_MANAGER_ABI,
      functionName: 'hasRole',
      args: [ROLES.DEFAULT_ADMIN_ROLE, network.timelock],
    }),
    client.readContract({
      address: network.delegationManager,
      abi: DELEGATION_MANAGER_ABI,
      functionName: 'hasRole',
      args: [ROLES.DEFAULT_ADMIN_ROLE, expected.operator],
    }),
    client.readContract({
      address: network.timelock,
      abi: TIMELOCK_ABI,
      functionName: 'hasRole',
      args: [ROLES.DEFAULT_ADMIN_ROLE, expected.operator],
    }),
    client.readContract({
      address: network.timelock,
      abi: TIMELOCK_ABI,
      functionName: 'hasRole',
      args: [ROLES.PROPOSER_ROLE, expected.operator],
    }),
    client.readContract({
      address: network.timelock,
      abi: TIMELOCK_ABI,
      functionName: 'hasRole',
      args: [ROLES.EXECUTOR_ROLE, expected.operator],
    }),
    client.readContract({
      address: network.timelock,
      abi: TIMELOCK_ABI,
      functionName: 'hasRole',
      args: [ROLES.CANCELLER_ROLE, expected.operator],
    }),
    client.readContract({
      address: network.timelock,
      abi: TIMELOCK_ABI,
      functionName: 'hasRole',
      args: [ROLES.EXECUTOR_ROLE, ZERO_ADDRESS],
    }),
  ]);

  const checks = {
    timelockMinDelay: minDelay.toString() === expected.timelockMinDelaySeconds,
    marketplaceTimelockGovernance,
    marketplaceOperatorNoGovernance: !marketplaceOperatorGovernance,
    marketplaceOperatorNoAdmin: !marketplaceOperatorAdmin,
    delegationMarketplaceConsumer,
    delegationFactoryRole,
    delegationTimelockAdmin,
    delegationOperatorNoAdmin: !delegationOperatorAdmin,
    timelockOperatorAdmin,
    timelockOperatorProposer,
    timelockOperatorExecutor,
    timelockOperatorCanceller,
    timelockOpenExecutorMatches: timelockOpenExecutor === expected.openExecutor,
  };

  return {
    ok: Object.values(checks).every(Boolean),
    note: expected.note,
    timelockMinDelaySeconds: minDelay.toString(),
    expectedTimelockMinDelaySeconds: expected.timelockMinDelaySeconds,
    operator: expected.operator,
    openExecutor: timelockOpenExecutor,
    expectedOpenExecutor: expected.openExecutor,
    checks,
  };
}

function everyValueTrue(record) {
  return Object.values(record).every(Boolean);
}

function everyCheckOk(checks) {
  return Object.values(checks).every((check) => check.ok);
}

function formatError(error) {
  if (error instanceof Error) {
    return error.shortMessage || error.message;
  }
  return String(error);
}

async function checkNetwork(network) {
  const client = createPublicClient({ transport: http(network.rpcUrl) });
  const [bytecode, versionChecks, configuredDelegationManager, tokenChecks, governance] = await Promise.all([
    checkBytecode(client, network),
    checkVersions(client, network),
    client.readContract({
      address: network.marketplace,
      abi: MARKETPLACE_ABI,
      functionName: 'delegationManager',
    }),
    checkTokens(client, network),
    checkGovernance(client, network),
  ]);

  const bytecodeReady = everyValueTrue(bytecode);
  const versionReady = everyCheckOk(versionChecks);
  const tokenReady = tokenChecks.every((token) => token.ok);
  const governanceReady = governance?.ok ?? true;
  const delegationReady = sameAddress(configuredDelegationManager, network.delegationManager);
  const blockedAsExpected =
    network.status === 'blocked' &&
    sameAddress(configuredDelegationManager, ZERO_ADDRESS);
  const networkStateReady = network.status === 'live' ? delegationReady : blockedAsExpected;
  const ok = bytecodeReady && versionReady && tokenReady && governanceReady && networkStateReady;

  return {
    key: network.key,
    label: network.label,
    chainId: network.chainId,
    expectedStatus: network.status,
    ok,
    checks: {
      bytecodeReady,
      versionReady,
      delegationReady,
      tokenReady,
      governanceReady,
      blockedAsExpected,
    },
    bytecode,
    versions: versionChecks,
    tokens: tokenChecks,
    governance,
    configuredDelegationManager,
    expectedDelegationManager: network.delegationManager,
    blockedReason: network.blockedReason,
  };
}

const results = [];
for (const network of NETWORKS) {
  try {
    results.push(await checkNetwork(network));
  } catch (error) {
    results.push({
      key: network.key,
      label: network.label,
      chainId: network.chainId,
      expectedStatus: network.status,
      ok: false,
      error: formatError(error),
    });
  }
}

const failed = results.filter((result) => !result.ok);
console.log(JSON.stringify({
  ok: failed.length === 0,
  checkedAt: new Date().toISOString(),
  results,
}, null, 2));

if (failed.length > 0) {
  process.exitCode = 1;
}
