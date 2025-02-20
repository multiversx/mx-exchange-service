import {
    ComplexityEstimator,
    ComplexityEstimatorArgs,
    simpleEstimator,
} from 'graphql-query-complexity';
import { complexityConfig } from 'src/config';

export function relayQueryEstimator(options: ComplexityEstimatorArgs): number {
    const count =
        options.args.pagination?.first ?? options.args.pagination?.last ?? 10;
    return count * options.childComplexity;
}

export function paginatedQueryEstimator(
    options: ComplexityEstimatorArgs,
): number {
    const count = options.args.limit ?? 10;
    return count * options.childComplexity;
}

export function rootQueryEstimator(): ComplexityEstimator {
    return (options: ComplexityEstimatorArgs): number | void => {
        if (!options.field.extensions || options.type.name !== 'Query') {
            return;
        }

        const exponent = options.context.queryCount;
        const exponentialComplexity = Math.pow(
            complexityConfig.costModifiers.exponentialBase,
            exponent,
        );

        options.context.queryCount = options.context.queryCount + 1;

        if (typeof options.field.extensions.complexity === 'number') {
            return exponentialComplexity * options.field.extensions.complexity;
        } else if (typeof options.field.extensions.complexity === 'function') {
            return (
                exponentialComplexity *
                options.field.extensions.complexity(options)
            );
        }
        const baseEstimate = simpleEstimator({
            defaultComplexity: complexityConfig.defaultComplexity,
        })(options);

        return typeof baseEstimate === 'number'
            ? exponentialComplexity * baseEstimate
            : exponentialComplexity;
    };
}

export function enforcedSingleQueryEstimator(
    options: ComplexityEstimatorArgs,
): number {
    const { maxComplexity } = complexityConfig;

    if (options.childComplexity < maxComplexity) {
        return maxComplexity;
    }

    return options.childComplexity;
}
