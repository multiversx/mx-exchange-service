import BigNumber from 'bignumber.js';
import { PairModel } from '../pair/models/pair.model';
import { BaseEsdtToken } from '../tokens/models/esdtToken.model';
import { computeValueUSD } from 'src/utils/token.converters';
import { constantsConfig } from 'src/config';
import { SWAP_TYPE } from '../auto-router/models/auto-route.model';
import { getAmountOut } from '../pair/pair.utils';

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

    for (let i = 0; i < tokensRoute.length - 1; i++) {
        const pair = getPairByTokens(pairs, tokensRoute[i], tokensRoute[i + 1]);
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

export function getPairsRoute(
    addresses: string[],
    pairs: PairModel[],
): PairModel[] {
    const routePairs: PairModel[] = [];
    for (const address of addresses) {
        const pair = pairs.find((pair) => pair.address === address);
        if (pair !== undefined) {
            routePairs.push(pair);
        }
    }

    return routePairs;
}

export function calculateExchangeRate(
    tokenInDecimals: number,
    tokenOutDecimals: number,
    amountIn: string,
    amountOut: string,
): string[] {
    if (amountIn === '0' || amountOut === '0') {
        return ['0', '0'];
    }

    const tokenInPrice = new BigNumber(10)
        .pow(tokenInDecimals)
        .multipliedBy(amountOut)
        .dividedBy(amountIn);
    const tokenOutPrice = new BigNumber(10)
        .pow(tokenOutDecimals)
        .multipliedBy(amountIn)
        .dividedBy(amountOut);
    return [
        tokenInPrice.integerValue().toFixed(),
        tokenOutPrice.integerValue().toFixed(),
    ];
}

export function calculateTokenPriceDeviationPercent(
    tokenRoute: string[],
    intermediaryAmounts: string[],
    tokensMetadata: BaseEsdtToken[],
    tokensPriceUSD: string[],
): number {
    for (let index = 0; index < tokenRoute.length - 1; index++) {
        const [tokenInID, amountIn, tokenOutID, amountOut] = [
            tokenRoute[index],
            intermediaryAmounts[index],
            tokenRoute[index + 1],
            intermediaryAmounts[index + 1],
        ];

        const [
            tokenIn,
            tokenInPriceUSD,
            intermediaryTokenOut,
            intermediaryTokenOutPriceUSD,
        ] = [
            tokensMetadata[index],
            tokensPriceUSD[index],
            tokensMetadata[index + 1],
            tokensPriceUSD[index + 1],
        ];

        const amountInUSD = computeValueUSD(
            amountIn,
            tokenIn.decimals,
            tokenInPriceUSD,
        );
        const amountOutUSD = computeValueUSD(
            amountOut,
            intermediaryTokenOut.decimals,
            intermediaryTokenOutPriceUSD,
        );

        const priceDeviationPercent = amountInUSD.isLessThan(amountOutUSD)
            ? new BigNumber(1).minus(amountInUSD.dividedBy(amountOutUSD))
            : new BigNumber(1).minus(amountOutUSD.dividedBy(amountInUSD));

        if (
            priceDeviationPercent.toNumber() > constantsConfig.MAX_SWAP_SPREAD
        ) {
            console.log(`Spread too big validating parallel route swap transaction ${tokenInID} => ${tokenOutID}.
              amount in = ${amountIn}, usd value = ${amountInUSD};
              amount out = ${amountOut}, usd value = ${amountOutUSD}`);
        }
        return priceDeviationPercent.toNumber();
    }
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

export function isFixedInput(swapType: SWAP_TYPE): boolean {
    if (swapType === SWAP_TYPE.fixedInput) return true;
    return false;
}

export function addTolerance(amountIn: string, tolerance: number): string {
    return new BigNumber(amountIn)
        .plus(new BigNumber(amountIn).multipliedBy(tolerance))
        .integerValue()
        .toFixed();
}

export function computePriceImpactPercent(
    reserves: string,
    amount: string,
): string {
    return new BigNumber(amount).dividedBy(reserves).times(100).toFixed();
}

export function getPriceImpactPercents(
    intermediaryAmounts: string[],
    tokenRoute: string[],
    pairs: PairModel[],
): string[] {
    return pairs.map((pair, index) => {
        return computePriceImpactPercent(
            pair.firstToken.identifier === tokenRoute[index + 1]
                ? pair.info.reserves0
                : pair.info.reserves1,
            intermediaryAmounts[index + 1],
        );
    });
}
