import { describe, expect, it } from 'vitest';
import { buildBufferedEip1559FeeOverrides } from '@/utils/transactionFeeOverrides';

describe('buildBufferedEip1559FeeOverrides', () => {
  it('buffers maxFeePerGas above the latest block base fee', () => {
    const fees = buildBufferedEip1559FeeOverrides({
      baseFeePerGas: 20_050_000n,
      estimatedMaxFeePerGas: 20_034_000n,
      estimatedMaxPriorityFeePerGas: 0n,
    });

    expect(fees.maxFeePerGas).toBe(60_150_000n);
    expect(fees.maxFeePerGas! > 20_050_000n).toBe(true);
    expect(fees.maxPriorityFeePerGas).toBe(0n);
  });

  it('keeps a higher wallet estimate when it is already above the buffer', () => {
    const fees = buildBufferedEip1559FeeOverrides({
      baseFeePerGas: 20_000_000n,
      estimatedMaxFeePerGas: 100_000_000n,
      estimatedMaxPriorityFeePerGas: 1_000_000n,
    });

    expect(fees.maxFeePerGas).toBe(100_000_000n);
    expect(fees.maxPriorityFeePerGas).toBe(1_000_000n);
  });

  it('does not add EIP-1559 fields for legacy fee blocks', () => {
    expect(buildBufferedEip1559FeeOverrides({ baseFeePerGas: null })).toEqual({});
  });
});
