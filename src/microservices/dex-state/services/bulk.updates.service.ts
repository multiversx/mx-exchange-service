import { getTokenForGivenPosition, quote } from 'src/modules/pair/pair.utils';
import BigNumber from 'bignumber.js';
import {
    constantsConfig,
    mxConfig,
    scAddress,
    tokenProviderUSD,
} from 'src/config';
import { computeValueUSD } from 'src/utils/token.converters';
import { Pair, PairInfo } from '../interfaces/pairs.interfaces';
import { Token, TokenType } from '../interfaces/tokens.interfaces';
import { PairStateChanges } from 'src/modules/rabbitmq/state-changes/types';

export class BulkUpdatesService {
    private usdcPrice: number;
    private commonTokenIDs: string[];
    private tokenToPairs: Map<string, Pair[]> = new Map();
    private pairs: Map<string, Pair>;
    private tokens: Map<string, Token>;

    recomputeAllValues(
        pairs: Map<string, Pair>,
        tokens: Map<string, Token>,
        usdcPrice: number,
        commonTokenIDs: string[],
    ): void {
        this.initMaps(pairs, tokens, usdcPrice, commonTokenIDs);

        for (const [address, pair] of this.pairs.entries()) {
            this.updatePairReservesAndPrices(address, {
                reserves0: pair.info.reserves0,
                reserves1: pair.info.reserves1,
                totalSupply: pair.info.totalSupply,
            });
        }

        this.updateTokensDerivedEgldAndUsdPrices();

        this.updateValuesUSD();
    }

    private initMaps(
        pairs: Map<string, Pair>,
        tokens: Map<string, Token>,
        usdcPrice: number,
        commonTokenIDs: string[],
    ): void {
        this.pairs = new Map(pairs);
        this.tokens = new Map(tokens);
        this.usdcPrice = usdcPrice;
        this.commonTokenIDs = commonTokenIDs;
        this.tokenToPairs.clear();

        pairs.forEach((pair) => {
            const { firstTokenId, secondTokenId } = pair;
            if (!this.tokenToPairs.has(firstTokenId)) {
                this.tokenToPairs.set(firstTokenId, []);
            }
            if (!this.tokenToPairs.has(secondTokenId)) {
                this.tokenToPairs.set(secondTokenId, []);
            }

            this.tokenToPairs.get(firstTokenId).push(pair);
            this.tokenToPairs.get(secondTokenId).push(pair);
        });
    }

    private updatePairReservesAndPrices(
        address: string,
        stateChanges: PairStateChanges,
    ): void {
        const pair = this.pairs.get(address);

        const info = {
            reserves0: stateChanges.reserves0 ?? pair.info.reserves0,
            reserves1: stateChanges.reserves1 ?? pair.info.reserves1,
            totalSupply: stateChanges.totalSupply ?? pair.info.totalSupply,
        };

        const { firstTokenPrice, secondTokenPrice } =
            this.computeTokensPriceByReserves(
                info,
                this.tokens.get(pair.firstTokenId),
                this.tokens.get(pair.secondTokenId),
            );

        pair.info = info;
        pair.firstTokenPrice = firstTokenPrice;
        pair.secondTokenPrice = secondTokenPrice;
    }

    private updateTokensDerivedEgldAndUsdPrices(): void {
        const egldPriceUSD = this.pairs.get(
            scAddress.WEGLD_USDC,
        ).firstTokenPrice;

        for (const [tokenID, token] of this.tokens.entries()) {
            if (token.type === TokenType.TOKEN_TYPE_FUNGIBLE_LP_TOKEN) {
                token.derivedEGLD = '0';
                continue;
            }

            const derivedEGLD = this.computeTokenPriceDerivedEGLD(
                tokenID,
                egldPriceUSD,
            );

            const price = new BigNumber(derivedEGLD)
                .times(egldPriceUSD)
                .times(this.usdcPrice)
                .toFixed();

            token.price = price;
            token.derivedEGLD = derivedEGLD;
        }
    }

    private updateValuesUSD(): void {
        for (const [address, pair] of this.pairs.entries()) {
            const firstTokenPriceUSD = this.tokens.get(pair.firstTokenId).price;
            const secondTokenPriceUSD = this.tokens.get(
                pair.secondTokenId,
            ).price;

            const {
                firstTokenLockedValueUSD,
                secondTokenLockedValueUSD,
                lockedValueUSD,
            } = this.computePairLockedValuesUSD(
                address,
                firstTokenPriceUSD,
                secondTokenPriceUSD,
            );

            const liquidityPoolTokenPriceUSD =
                this.computePairLpTokenPriceUSD(address);

            pair.firstTokenPriceUSD = firstTokenPriceUSD;
            pair.secondTokenPriceUSD = secondTokenPriceUSD;
            pair.firstTokenLockedValueUSD = firstTokenLockedValueUSD;
            pair.secondTokenLockedValueUSD = secondTokenLockedValueUSD;
            pair.lockedValueUSD = lockedValueUSD;
            pair.liquidityPoolTokenPriceUSD = liquidityPoolTokenPriceUSD;
        }

        for (const token of this.tokens.values()) {
            if (token.type === TokenType.TOKEN_TYPE_FUNGIBLE_LP_TOKEN) {
                token.price = this.pairs.get(
                    token.pairAddress,
                ).liquidityPoolTokenPriceUSD;
                token.liquidityUSD = '0';
            } else {
                token.liquidityUSD = this.computeTokenLiquidityUSD(
                    token.identifier,
                );
            }
        }
    }

    private computeTokensPriceByReserves(
        info: PairInfo,
        firstToken: Token,
        secondToken: Token,
    ): {
        firstTokenPrice: string;
        secondTokenPrice: string;
    } {
        const firstTokenPrice = quote(
            new BigNumber(`1e${firstToken.decimals}`).toFixed(),
            info.reserves0,
            info.reserves1,
        )
            .multipliedBy(`1e-${secondToken.decimals}`)
            .toFixed();

        const secondTokenPrice = quote(
            new BigNumber(`1e${secondToken.decimals}`).toFixed(),
            info.reserves1,
            info.reserves0,
        )
            .multipliedBy(`1e-${firstToken.decimals}`)
            .toFixed();

        return { firstTokenPrice, secondTokenPrice };
    }

    private computeTokenPriceDerivedEGLD(
        tokenID: string,
        egldPriceInUSD: string,
    ): string {
        const memo = new Map<string, string>();
        const doNotVisit = new Set<string>();

        const loadPairsForToken = (id: string): Pair[] => {
            let pairs = this.tokenToPairs.get(id);

            if (!pairs || pairs.length === 0) {
                return [];
            }

            if (pairs.length > 1) {
                if (pairs.some((p) => p.state === 'Active')) {
                    pairs = pairs.filter((p) => p.state === 'Active');
                }
            }

            const tokenPairs: Pair[] = [];

            pairs.forEach((pair) => {
                if (!doNotVisit.has(pair.address)) {
                    tokenPairs.push(pair);
                    doNotVisit.add(pair.address);
                }
            });

            return tokenPairs;
        };

        const tokenDerivedEGLD = (tokenID: string): string => {
            if (memo.has(tokenID)) {
                return memo.get(tokenID);
            }

            if (tokenID === tokenProviderUSD) {
                memo.set(tokenID, '1');
                return '1';
            }

            if (tokenID === constantsConfig.USDC_TOKEN_ID) {
                if (!egldPriceInUSD || isNaN(Number(egldPriceInUSD))) {
                    throw new Error(
                        `Invalid egldPriceInUSD: "${egldPriceInUSD}"`,
                    );
                }

                const price = new BigNumber(1)
                    .dividedBy(egldPriceInUSD)
                    .toFixed();
                memo.set(tokenID, price);
                return price;
            }

            const pairs = loadPairsForToken(tokenID);

            let largestLiquidityEGLD = new BigNumber(0);
            let priceSoFar = new BigNumber(0);

            for (const pair of pairs) {
                if (new BigNumber(pair.info.totalSupply).lte(0)) {
                    continue;
                }

                if (pair.firstTokenId === tokenID) {
                    const secondTokenDerivedEGLD = tokenDerivedEGLD(
                        pair.secondTokenId,
                    );

                    const secondToken = this.tokens.get(pair.secondTokenId);
                    const egldLocked = new BigNumber(pair.info.reserves1)
                        .times(`1e-${secondToken.decimals}`)
                        .times(secondTokenDerivedEGLD)
                        .times(`1e${mxConfig.EGLDDecimals}`)
                        .integerValue();
                    if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                        largestLiquidityEGLD = egldLocked;
                        priceSoFar = new BigNumber(pair.firstTokenPrice).times(
                            secondTokenDerivedEGLD,
                        );
                    }
                } else {
                    const firstTokenDerivedEGLD = tokenDerivedEGLD(
                        pair.firstTokenId,
                    );

                    const firstToken = this.tokens.get(pair.firstTokenId);
                    const egldLocked = new BigNumber(pair.info.reserves0)
                        .times(`1e-${firstToken.decimals}`)
                        .times(firstTokenDerivedEGLD)
                        .times(`1e${mxConfig.EGLDDecimals}`)
                        .integerValue();
                    if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                        largestLiquidityEGLD = egldLocked;
                        priceSoFar = new BigNumber(pair.secondTokenPrice).times(
                            firstTokenDerivedEGLD,
                        );
                    }
                }
            }

            memo.set(tokenID, priceSoFar.toFixed());

            return priceSoFar.toFixed();
        };

        return tokenDerivedEGLD(tokenID);
    }

    private computeTokenLiquidityUSD(tokenID: string): string {
        const tokenPairs = this.tokenToPairs.get(tokenID);

        let newLockedValue = new BigNumber(0);
        for (const pair of tokenPairs) {
            if (
                pair.state === 'Active' ||
                (this.commonTokenIDs.includes(pair.firstTokenId) &&
                    this.commonTokenIDs.includes(pair.secondTokenId))
            ) {
                const tokenLockedValueUSD =
                    tokenID === pair.firstTokenId
                        ? this.pairs.get(pair.address).firstTokenLockedValueUSD
                        : this.pairs.get(pair.address)
                              .secondTokenLockedValueUSD;
                newLockedValue = newLockedValue.plus(tokenLockedValueUSD);
                continue;
            }

            if (
                !this.commonTokenIDs.includes(pair.firstTokenId) &&
                !this.commonTokenIDs.includes(pair.secondTokenId)
            ) {
                continue;
            }

            const commonTokenLockedValueUSD = this.commonTokenIDs.includes(
                pair.firstTokenId,
            )
                ? new BigNumber(
                      this.pairs.get(pair.address).firstTokenLockedValueUSD,
                  )
                : new BigNumber(
                      this.pairs.get(pair.address).secondTokenLockedValueUSD,
                  );

            newLockedValue = newLockedValue.plus(commonTokenLockedValueUSD);
        }

        return newLockedValue.toFixed();
    }

    private computePairLockedValuesUSD(
        address: string,
        firstTokenPriceUSD: string,
        secondTokenPriceUSD: string,
    ): {
        firstTokenLockedValueUSD: string;
        secondTokenLockedValueUSD: string;
        lockedValueUSD: string;
    } {
        const pair = this.pairs.get(address);
        const firstToken = this.tokens.get(pair.firstTokenId);
        const secondToken = this.tokens.get(pair.secondTokenId);

        const firstTokenLockedValueUSD = new BigNumber(pair.info.reserves0)
            .multipliedBy(`1e-${firstToken.decimals}`)
            .multipliedBy(firstTokenPriceUSD);

        const secondTokenLockedValueUSD = new BigNumber(pair.info.reserves1)
            .multipliedBy(`1e-${secondToken.decimals}`)
            .multipliedBy(secondTokenPriceUSD);

        const result = {
            firstTokenLockedValueUSD: firstTokenLockedValueUSD.toFixed(),
            secondTokenLockedValueUSD: secondTokenLockedValueUSD.toFixed(),
            lockedValueUSD: '0',
        };

        if (
            pair.state === 'Active' ||
            (this.commonTokenIDs.includes(pair.firstTokenId) &&
                this.commonTokenIDs.includes(pair.secondTokenId))
        ) {
            result.lockedValueUSD = firstTokenLockedValueUSD
                .plus(secondTokenLockedValueUSD)
                .toFixed();

            return result;
        }

        if (
            this.commonTokenIDs.includesNone([
                pair.firstTokenId,
                pair.secondTokenId,
            ])
        ) {
            return result;
        }

        const commonTokenLockedValueUSD = this.commonTokenIDs.includes(
            pair.firstTokenId,
        )
            ? firstTokenLockedValueUSD
            : secondTokenLockedValueUSD;

        result.lockedValueUSD = commonTokenLockedValueUSD
            .multipliedBy(2)
            .toFixed();

        return result;
    }

    private computePairLpTokenPriceUSD(address: string): string {
        const pair = this.pairs.get(address);
        if (!pair.liquidityPoolTokenId) {
            return '0';
        }

        const liquidityPoolToken = this.tokens.get(pair.liquidityPoolTokenId);
        const firstToken = this.tokens.get(pair.firstTokenId);
        const secondToken = this.tokens.get(pair.secondTokenId);

        const lpAmount = new BigNumber(
            `1e${liquidityPoolToken.decimals}`,
        ).toFixed();

        const firstTokenAmount = getTokenForGivenPosition(
            lpAmount,
            pair.info.reserves0,
            pair.info.totalSupply,
        );
        const secondTokenAmount = getTokenForGivenPosition(
            lpAmount,
            pair.info.reserves1,
            pair.info.totalSupply,
        );

        const firstTokenValueUSD = computeValueUSD(
            firstTokenAmount.toFixed(),
            firstToken.decimals,
            firstToken.price,
        );

        const secondTokenValueUSD = computeValueUSD(
            secondTokenAmount.toFixed(),
            secondToken.decimals,
            secondToken.price,
        );

        return firstTokenValueUSD.plus(secondTokenValueUSD).toFixed();
    }
}
