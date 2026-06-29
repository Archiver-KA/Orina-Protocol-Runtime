type Eip1559FeeOverrides = {
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
};

type FeeEstimateInput = {
  baseFeePerGas?: bigint | null;
  estimatedMaxFeePerGas?: bigint | null;
  estimatedMaxPriorityFeePerGas?: bigint | null;
};

type PublicFeeClient = {
  getBlock: (args?: { blockTag?: 'latest' }) => Promise<{ baseFeePerGas?: bigint | null }>;
  estimateFeesPerGas?: () => Promise<Eip1559FeeOverrides>;
};

const EIP1559_BASE_FEE_BUFFER_MULTIPLIER = 3n;

export function buildBufferedEip1559FeeOverrides(input: FeeEstimateInput): Eip1559FeeOverrides {
  const baseFeePerGas = input.baseFeePerGas ?? 0n;
  if (baseFeePerGas <= 0n) return {};

  const estimatedMaxFeePerGas = input.estimatedMaxFeePerGas ?? 0n;
  const bufferedMaxFeePerGas = baseFeePerGas * EIP1559_BASE_FEE_BUFFER_MULTIPLIER;
  const maxFeePerGas = estimatedMaxFeePerGas > bufferedMaxFeePerGas
    ? estimatedMaxFeePerGas
    : bufferedMaxFeePerGas;

  return {
    maxFeePerGas,
    maxPriorityFeePerGas: input.estimatedMaxPriorityFeePerGas ?? 0n,
  };
}

export async function resolveBufferedEip1559FeeOverrides(
  publicClient: PublicFeeClient | undefined,
): Promise<Eip1559FeeOverrides> {
  if (!publicClient) return {};

  try {
    const [block, estimatedFees] = await Promise.all([
      publicClient.getBlock({ blockTag: 'latest' }),
      publicClient.estimateFeesPerGas?.().catch(() => ({})) ?? Promise.resolve({}),
    ]);

    return buildBufferedEip1559FeeOverrides({
      baseFeePerGas: block.baseFeePerGas,
      estimatedMaxFeePerGas: estimatedFees.maxFeePerGas,
      estimatedMaxPriorityFeePerGas: estimatedFees.maxPriorityFeePerGas,
    });
  } catch {
    return {};
  }
}
