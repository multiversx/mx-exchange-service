import { ComplexityEstimatorArgs } from 'graphql-query-complexity';
import { complexityConfig } from 'src/config';

export function nestedFieldComplexity(
    options: ComplexityEstimatorArgs,
): number {
    const cost =
        options.childComplexity * complexityConfig.costModifiers.nested + 1;
    return cost;
}
