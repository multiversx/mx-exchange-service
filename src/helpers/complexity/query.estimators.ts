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
    const count = options.args.page?.limit ?? 10;
    return count * options.childComplexity;
}

export function rootQueryEstimator(): ComplexityEstimator {
    return (args: ComplexityEstimatorArgs): number | void => {
        if (!args.field.extensions || args.type.name !== 'Query') {
            return;
        }

        const exponent = args.context.queryCount;
        const exponentialComplexity = Math.pow(
            complexityConfig.costModifiers.exponentialBase,
            exponent,
        );

        args.context.queryCount = args.context.queryCount + 1;

        if (typeof args.field.extensions.complexity === 'number') {
            return exponentialComplexity + args.field.extensions.complexity;
        } else if (typeof args.field.extensions.complexity === 'function') {
            return (
                exponentialComplexity + args.field.extensions.complexity(args)
            );
        }
        const baseEstimate = simpleEstimator({
            defaultComplexity: complexityConfig.defaultComplexity,
        })(args);

        return typeof baseEstimate === 'number'
            ? exponentialComplexity + baseEstimate
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
