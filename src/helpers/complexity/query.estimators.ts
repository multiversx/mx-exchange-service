import { ComplexityEstimatorArgs } from 'graphql-query-complexity';

export function estimateRelayQueryComplexity(
    options: ComplexityEstimatorArgs,
): number {
    const count =
        options.args.pagination?.first ?? options.args.pagination?.last ?? 10;
    return count * options.childComplexity;
}

export function estimatePaginatedQueryComplexity(
    options: ComplexityEstimatorArgs,
): number {
    const count = options.args.page?.limit ?? 10;
    return count * options.childComplexity;
}
