import BigNumber from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { getAmountOut } from 'src/modules/pair/pair.utils';

export function getPairByTokens(
    pairs: PairModel[],
    tokenIn: string,
    tokenOut: string,
): PairModel | undefined {
    for (const pair of pairs) {
        if (
            (tokenIn === pair.firstToken.identifier &&
                tokenOut === pair.secondToken.identifier) ||
            (tokenIn === pair.secondToken.identifier &&
                tokenOut === pair.firstToken.identifier)
        ) {
            return pair;
        }
    }
    return undefined;
}

export function getAddressRoute(
    pairs: PairModel[],
    tokensRoute: string[],
): string[] {
    const addressRoute: string[] = [];

    for (let index = 0; index < tokensRoute.length - 1; index++) {
        const pair = getPairByTokens(
            pairs,
            tokensRoute[index],
            tokensRoute[index + 1],
        );
        if (pair) {
            addressRoute.push(pair.address);
        }
    }
    return addressRoute;
}

export function getOrderedReserves(
    tokenInID: string,
    pair: PairModel,
): [string, string] {
    return tokenInID === pair.firstToken.identifier
        ? [pair.info.reserves0, pair.info.reserves1]
        : [pair.info.reserves1, pair.info.reserves0];
}

export function getPoolsUsedByPath(
    path: string[],
    pairs: PairModel[],
): string[] {
    const poolAddresses: string[] = [];

    for (let i = 0; i < path.length - 1; i++) {
        const pair = getPairByTokens(pairs, path[i], path[i + 1]);
        if (pair) {
            poolAddresses.push(pair.address);
        }
    }

    return poolAddresses;
}

export function computeIntermediaryAmountsFixedInput(
    path: string[],
    pairs: PairModel[],
    initialAmountIn: string,
): string[] {
    const amounts: string[] = [initialAmountIn];
    let currentAmount = new BigNumber(initialAmountIn);

    for (let i = 0; i < path.length - 1; i++) {
        const tokenIn = path[i];
        const tokenOut = path[i + 1];
        const pair = getPairByTokens(pairs, tokenIn, tokenOut);

        if (!pair) {
            amounts.push('0');
            break;
        }

        const [resIn, resOut] = getOrderedReserves(tokenIn, pair);
        const outputAmount = getAmountOut(
            currentAmount.toFixed(),
            resIn,
            resOut,
            pair.totalFeePercent,
        );

        amounts.push(outputAmount.toFixed());
        currentAmount = outputAmount;
    }

    return amounts;
}

export function computeRouteOutputFixedIn(
    path: string[],
    pairs: PairModel[],
    amountIn: BigNumber,
): BigNumber {
    let currentAmount = amountIn;

    for (let i = 0; i < path.length - 1; i++) {
        const tokenIn = path[i];
        const tokenOut = path[i + 1];
        const pair = getPairByTokens(pairs, tokenIn, tokenOut);

        if (!pair) {
            return new BigNumber(0);
        }

        const [resIn, resOut] = getOrderedReserves(tokenIn, pair);
        const [resInBN, resOutBN] = [
            new BigNumber(resIn),
            new BigNumber(resOut),
        ];

        if (resInBN.isZero() || resOutBN.isZero() || currentAmount.isZero()) {
            return new BigNumber(0);
        }

        currentAmount = getAmountOut(
            currentAmount.toFixed(),
            resIn,
            resOut,
            pair.totalFeePercent,
        );

        if (currentAmount.isZero()) {
            return new BigNumber(0);
        }
    }

    return currentAmount;
}
