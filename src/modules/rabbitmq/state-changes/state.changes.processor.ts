import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairDocument } from 'src/modules/pair/persistence/schemas/pair.schema';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import { EsdtTokenDocument } from 'src/modules/tokens/persistence/schemas/esdtToken.schema';
import { PairStateChanges } from './state.changes.consumer';
import { AnyBulkWriteOperation } from 'mongodb';
import { PairInfoModel } from 'src/modules/pair/models/pair-info.model';
import { getTokenForGivenPosition, quote } from 'src/modules/pair/pair.utils';
import BigNumber from 'bignumber.js';
import {
    constantsConfig,
    mxConfig,
    scAddress,
    tokenProviderUSD,
} from 'src/config';
import { computeValueUSD } from 'src/utils/token.converters';

export type MongoBulkOperations = {
    pairBulkOps: AnyBulkWriteOperation<PairDocument>[];
    tokenBulkOps: AnyBulkWriteOperation<EsdtTokenDocument>[];
};

export class StateChangesProcessor {
    private usdcPrice: number;
    private commonTokenIDs: string[];
    private tokenToPairs: Map<string, PairModel[]> = new Map();
    private pairs: Map<string, PairModel>;
    private tokens: Map<string, EsdtToken>;
    private pairsUpdates: Map<string, Partial<PairModel>> = new Map();
    private tokensUpdates: Map<string, Partial<EsdtToken>> = new Map();

    constructor(
        pairs: Map<string, PairModel>,
        tokens: Map<string, EsdtToken>,
        usdcPrice: number,
        commonTokenIDs: string[],
    ) {
        this.pairs = new Map(pairs);
        this.tokens = new Map(tokens);
        this.usdcPrice = usdcPrice;
        this.commonTokenIDs = commonTokenIDs;

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

    getDbUpdateOperations(
        stateChangesMap: Map<string, PairStateChanges>,
    ): MongoBulkOperations {
        for (const [address, stateChanges] of stateChangesMap.entries()) {
            this.updatePairReservesAndPrices(address, stateChanges);
        }

        // TODO: all token IDs with changes + pairs to update = keys(pairUpdates) + pairs of keys(tokensUpdates)

        this.updateTokensDerivedPriceEGLD();

        this.updateValuesUSD();

        return this.convertUpdatesToMongoBulkOperations();
    }

    recomputeAllValues(): MongoBulkOperations {
        for (const [address, pair] of this.pairs.entries()) {
            this.updatePairReservesAndPrices(address, { ...pair.info });
        }

        this.updateTokensDerivedPriceEGLD();

        this.updateValuesUSD();

        return this.convertUpdatesToMongoBulkOperations();
    }

    private convertUpdatesToMongoBulkOperations(): MongoBulkOperations {
        const pairBulkOps: AnyBulkWriteOperation<PairDocument>[] = [];
        const tokenBulkOps: AnyBulkWriteOperation<EsdtTokenDocument>[] = [];

        for (const [address, updates] of this.pairsUpdates.entries()) {
            pairBulkOps.push({
                updateOne: {
                    filter: { address },
                    update: {
                        $set: updates,
                    },
                },
            });
        }

        for (const [identifier, updates] of this.tokensUpdates.entries()) {
            tokenBulkOps.push({
                updateOne: {
                    filter: { identifier },
                    update: {
                        $set: updates,
                    },
                },
            });
        }

        return {
            pairBulkOps,
            tokenBulkOps,
        };
    }

    private updatePairReservesAndPrices(
        address: string,
        stateChanges: PairStateChanges,
    ): void {
        const pair = this.pairs.get(address);

        // const rawUpdates: Partial<PairModel> = {};

        // if (
        //     Object.keys(stateChanges).includes(
        //         PAIR_FIELDS.firstTokenReserve ||
        //             PAIR_FIELDS.secondTokenReserve ||
        //             PAIR_FIELDS.totalSupply,
        //     )
        // ) {
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

        this.syncPairUpdates(
            address,
            {
                info,
                firstTokenPrice,
                secondTokenPrice,
            },
            true,
        );

        pair.info = info;
        pair.firstTokenPrice = firstTokenPrice;
        pair.secondTokenPrice = secondTokenPrice;
    }

    private updateTokensDerivedPriceEGLD(): void {
        const egldPriceUSD = this.pairs.get(
            scAddress.WEGLD_USDC,
        ).firstTokenPrice;

        for (const [tokenID, token] of this.tokens.entries()) {
            if (token.type === EsdtTokenType.FungibleLpToken) {
                continue;
            }

            const derivedEGLD = this.computeTokenPriceDerivedEGLD(
                tokenID,
                egldPriceUSD,
            );

            if (token.derivedEGLD === derivedEGLD) {
                continue;
            }

            const price = new BigNumber(derivedEGLD)
                .times(egldPriceUSD)
                .times(this.usdcPrice)
                .toFixed();

            this.syncTokenUpdates(tokenID, { price, derivedEGLD }, true);

            token.price = price;
            token.derivedEGLD = derivedEGLD;
        }
    }

    updateValuesUSD(): void {
        const tokensNeedingUpdate: Set<string> = new Set();

        for (const [address, pair] of this.pairs.entries()) {
            const { firstTokenPriceUSD, secondTokenPriceUSD } =
                this.computePairTokensPriceUSD(address);

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

            const rawPairUpdates: Partial<PairModel> = {
                firstTokenPriceUSD,
                secondTokenPriceUSD,
                firstTokenLockedValueUSD,
                secondTokenLockedValueUSD,
                lockedValueUSD,
                liquidityPoolTokenPriceUSD,
            };

            const pairChanged = this.syncPairUpdates(address, rawPairUpdates);

            if (pairChanged) {
                pair.firstTokenPriceUSD = firstTokenPriceUSD;
                pair.secondTokenPriceUSD = secondTokenPriceUSD;
                pair.firstTokenLockedValueUSD = firstTokenLockedValueUSD;
                pair.secondTokenLockedValueUSD = secondTokenLockedValueUSD;
                pair.lockedValueUSD = lockedValueUSD;
                pair.liquidityPoolTokenPriceUSD = liquidityPoolTokenPriceUSD;

                tokensNeedingUpdate.add(pair.firstTokenId);
                tokensNeedingUpdate.add(pair.secondTokenId);

                if (pair.liquidityPoolTokenId) {
                    tokensNeedingUpdate.add(pair.liquidityPoolTokenId);
                }
            }
        }

        for (const tokenID of tokensNeedingUpdate.values()) {
            const token = this.tokens.get(tokenID);
            if (token.type === EsdtTokenType.FungibleLpToken) {
                const { liquidityPoolTokenPriceUSD } = this.pairs.get(
                    token.pairAddress,
                );
                this.syncTokenUpdates(tokenID, {
                    price: liquidityPoolTokenPriceUSD,
                });

                token.price = liquidityPoolTokenPriceUSD;
            } else {
                const liquidityUSD = this.computeTokenLiquidityUSD(tokenID);
                this.syncTokenUpdates(tokenID, { liquidityUSD });

                token.liquidityUSD = liquidityUSD;
            }
        }

        // console.log(tokensNeedingUpdate);
    }

    private computeTokensPriceByReserves(
        info: PairInfoModel,
        firstToken: EsdtToken,
        secondToken: EsdtToken,
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

        const loadPairsForToken = (id: string): PairModel[] => {
            let tokenPairs = this.tokenToPairs.get(id);

            if (tokenPairs.length > 1) {
                if (tokenPairs.some((p) => p.state === 'Active')) {
                    tokenPairs = tokenPairs.filter((p) => p.state === 'Active');
                }
            }

            tokenPairs = tokenPairs.filter(
                (pair) => !doNotVisit.has(pair.address),
            );

            for (const p of tokenPairs) {
                doNotVisit.add(p.address);
            }

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

    private computePairTokensPriceUSD(address: string): {
        firstTokenPriceUSD: string;
        secondTokenPriceUSD: string;
    } {
        const pair = this.pairs.get(address);
        const firstToken = this.tokens.get(pair.firstTokenId);
        const secondToken = this.tokens.get(pair.secondTokenId);

        let firstTokenPriceUSD = firstToken.price;
        let secondTokenPriceUSD = secondToken.price;

        if (firstToken.identifier === constantsConfig.USDC_TOKEN_ID) {
            firstTokenPriceUSD = this.usdcPrice.toString();
            secondTokenPriceUSD = new BigNumber(pair.secondTokenPrice)
                .times(this.usdcPrice)
                .toFixed();
        }

        if (secondToken.identifier === constantsConfig.USDC_TOKEN_ID) {
            secondTokenPriceUSD = this.usdcPrice.toString();
            firstTokenPriceUSD = new BigNumber(pair.firstTokenPrice)
                .times(this.usdcPrice)
                .toFixed();
        }

        return {
            firstTokenPriceUSD,
            secondTokenPriceUSD,
        };
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
            pair.firstTokenPriceUSD,
        );

        const secondTokenValueUSD = computeValueUSD(
            secondTokenAmount.toFixed(),
            secondToken.decimals,
            pair.secondTokenPriceUSD,
        );

        return firstTokenValueUSD.plus(secondTokenValueUSD).toFixed();
    }

    private syncPairUpdates(
        address: string,
        partialPair: Partial<PairModel>,
        skipCheckValueChanged = false,
    ): boolean {
        const pair = this.pairs.get(address);

        if (skipCheckValueChanged) {
            if (!this.pairsUpdates.has(address)) {
                this.pairsUpdates.set(address, {});
            }

            this.pairsUpdates.set(address, {
                ...this.pairsUpdates.get(address),
                ...partialPair,
            });

            return true;
        }

        const rawUpdates: Partial<PairModel> = {};
        for (const [field, value] of Object.entries(partialPair)) {
            if (pair[field] !== value) {
                rawUpdates[field] = value;
            }
        }

        if (Object.keys(rawUpdates).length > 0) {
            if (!this.pairsUpdates.has(address)) {
                this.pairsUpdates.set(address, {});
            }

            this.pairsUpdates.set(address, {
                ...this.pairsUpdates.get(address),
                ...rawUpdates,
            });

            return true;
        }

        return false;
    }

    private syncTokenUpdates(
        identifier: string,
        partialToken: Partial<EsdtToken>,
        skipCheckValueChanged = false,
    ): void {
        const token = this.tokens.get(identifier);

        if (skipCheckValueChanged) {
            if (!this.tokensUpdates.has(identifier)) {
                this.tokensUpdates.set(identifier, {});
            }

            this.tokensUpdates.set(identifier, {
                ...this.tokensUpdates.get(identifier),
                ...partialToken,
            });

            return;
        }

        const rawUpdates: Partial<EsdtToken> = {};
        for (const [field, value] of Object.entries(partialToken)) {
            if (token[field] !== value) {
                rawUpdates[field] = value;
            }
        }

        if (Object.keys(rawUpdates).length > 0) {
            if (!this.tokensUpdates.has(identifier)) {
                this.tokensUpdates.set(identifier, {});
            }

            this.tokensUpdates.set(identifier, {
                ...this.tokensUpdates.get(identifier),
                ...rawUpdates,
            });
        }
    }
}
