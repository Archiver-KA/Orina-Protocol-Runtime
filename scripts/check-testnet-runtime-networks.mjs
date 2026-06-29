import { createPublicClient, http, parseAbi } from 'viem';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const NETWORKS = [
  {
    key: 'bnb-testnet',
    label: 'BNB Chain Testnet',
    chainId: 97,
    status: 'live',
    rpcUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545/',
    marketplace: '0x18E1C8ab257FAf16Ec8257A9715d07661194150B',
    paymentGateway: '0x082d75D8cA96C6e97B6b451Ad4857454A53D5C15',
    delegationManager: '0xb27C8eCc266423dDA3323983Ae3a2eF691ed8a13',
  },
  {
    key: 'base-sepolia',
    label: 'Base Sepolia',
    chainId: 84532,
    status: 'live',
    rpcUrl: 'https://sepolia.base.org',
    marketplace: '0x6d132Ba2327573c4e6f97a2167dCddb8059C4d14',
    paymentGateway: '0x1A880Ae46993282dd77C2dDCc5e36498eB616C92',
    delegationManager: '0xFC0038B7CC628966f8a7f14414c9386c2d6cB288',
  },
  {
    key: 'arbitrum-sepolia',
    label: 'Arbitrum Sepolia',
    chainId: 421614,
    status: 'live',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    marketplace: '0x5863f25A8250EBe20Bd1E3d04FD796081Fc3D72E',
    paymentGateway: '0x39F539903b75A0bF0FEF16a443904C8c9DF787EE',
    delegationManager: '0x56D454f55D5d05b060777F70e653BbBEb1167D2e',
  },
];

const abi = parseAbi([
  'function VERSION() view returns (string)',
  'function delegationManager() view returns (address)',
]);

function hasBytecode(code) {
  return Boolean(code && code !== '0x');
}

function sameAddress(left, right) {
  return String(left || '').toLowerCase() === String(right || '').toLowerCase();
}

async function checkNetwork(network) {
  const client = createPublicClient({ transport: http(network.rpcUrl) });
  const [
    marketplaceCode,
    paymentGatewayCode,
    delegationManagerCode,
    marketplaceVersion,
    configuredDelegationManager,
  ] = await Promise.all([
    client.getCode({ address: network.marketplace }),
    client.getCode({ address: network.paymentGateway }),
    client.getCode({ address: network.delegationManager }),
    client.readContract({
      address: network.marketplace,
      abi,
      functionName: 'VERSION',
    }),
    client.readContract({
      address: network.marketplace,
      abi,
      functionName: 'delegationManager',
    }),
  ]);

  const bytecodeReady =
    hasBytecode(marketplaceCode) &&
    hasBytecode(paymentGatewayCode) &&
    hasBytecode(delegationManagerCode);
  const delegationReady = sameAddress(configuredDelegationManager, network.delegationManager);
  const blockedAsExpected =
    network.status === 'blocked' &&
    sameAddress(configuredDelegationManager, ZERO_ADDRESS);
  const ok = bytecodeReady && (network.status === 'live' ? delegationReady : blockedAsExpected);

  return {
    key: network.key,
    label: network.label,
    chainId: network.chainId,
    expectedStatus: network.status,
    ok,
    bytecode: {
      marketplace: hasBytecode(marketplaceCode),
      paymentGateway: hasBytecode(paymentGatewayCode),
      delegationManager: hasBytecode(delegationManagerCode),
    },
    marketplaceVersion,
    configuredDelegationManager,
    expectedDelegationManager: network.delegationManager,
    delegationReady,
    blockedAsExpected,
    blockedReason: network.blockedReason,
  };
}

const results = [];
for (const network of NETWORKS) {
  results.push(await checkNetwork(network));
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
