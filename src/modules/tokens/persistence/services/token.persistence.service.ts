import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { TokenRepository } from './token.repository';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EsdtToken } from '../../models/esdtToken.model';
import { FilterQuery, ProjectionType } from 'mongoose';
import { TokenService } from '../../services/token.service';
import { EsdtTokenDocument } from '../schemas/esdtToken.schema';
import {
    constantsConfig,
    mxConfig,
    scAddress,
    tokenProviderUSD,
} from 'src/config';
import BigNumber from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairDocument } from 'src/modules/pair/persistence/schemas/pair.schema';
import { AnyBulkWriteOperation } from 'mongodb';
import { PairPersistenceService } from 'src/modules/pair/persistence/services/pair.persistence.service';

@Injectable()
export class TokenPersistenceService {
    constructor(
        private readonly tokenRepository: TokenRepository,
        private readonly tokenService: TokenService,
        @Inject(forwardRef(() => PairPersistenceService))
        private readonly pairPersistence: PairPersistenceService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async populateTokens(): Promise<void> {
        const tokenIDs = await this.tokenService.getUniqueTokenIDs(false);

        const counters = {
            added: 0,
            failed: 0,
        };

        for (const tokenID of tokenIDs) {
            const token = await this.tokenService.tokenMetadata(tokenID);
            try {
                await this.upsertToken(token);

                counters.added++;
            } catch (error) {
                counters.failed++;
            }
        }

        console.log(counters);
    }

    async bulkUpdatePairTokensPrice(usdcPrice: number): Promise<void> {
        const uniqueTokens = new Set<string>();
        const bulkOps: AnyBulkWriteOperation<EsdtTokenDocument>[] = [];

        const pairs = await this.pairPersistence.getFilteredPairs(
            {},
            {
                address: 1,
                info: 1,
                state: 1,
                firstToken: 1,
                firstTokenPrice: 1,
                secondToken: 1,
                secondTokenPrice: 1,
            },
            {
                path: 'firstToken secondToken',
                select: ['identifier', 'decimals'],
            },
        );

        const egldPriceUSD = this.getEgldPriceInUSD(pairs);

        pairs.forEach((pair) => {
            uniqueTokens.add(pair.firstToken.identifier);
            uniqueTokens.add(pair.secondToken.identifier);
        });

        for (const tokenID of uniqueTokens.values()) {
            const derivedEGLD = this.computeTokenPriceDerivedEGLD(
                tokenID,
                pairs,
                egldPriceUSD,
            );

            const price = new BigNumber(derivedEGLD)
                .times(egldPriceUSD)
                .times(usdcPrice)
                .toFixed();

            bulkOps.push({
                updateOne: {
                    filter: { identifier: tokenID },
                    update: {
                        $set: {
                            derivedEGLD,
                            price,
                        },
                    },
                },
            });
        }

        await this.bulkUpdateTokens(bulkOps);
    }

    async bulkUpdatePairTokensLiquidityUSD(
        commonTokenIDs: string[],
    ): Promise<void> {
        const uniqueTokens = new Set<string>();
        const bulkOps: AnyBulkWriteOperation<EsdtTokenDocument>[] = [];

        const pairs = await this.pairPersistence.getFilteredPairs(
            {},
            {
                address: 1,
                info: 1,
                state: 1,
                firstToken: 1,
                firstTokenPrice: 1,
                firstTokenPriceUSD: 1,
                firstTokenLockedValueUSD: 1,
                secondToken: 1,
                secondTokenPrice: 1,
                secondTokenPriceUSD: 1,
                secondTokenLockedValueUSD: 1,
                liquidityPoolToken: 1,
                liquidityPoolTokenPriceUSD: 1,
            },
            {
                path: 'firstToken secondToken liquidityPoolToken',
                select: ['identifier', 'decimals'],
            },
        );

        pairs.forEach((pair) => {
            uniqueTokens.add(pair.firstToken.identifier);
            uniqueTokens.add(pair.secondToken.identifier);

            if (pair.liquidityPoolToken) {
                bulkOps.push({
                    updateOne: {
                        filter: {
                            identifier: pair.liquidityPoolToken.identifier,
                        },
                        update: {
                            $set: {
                                price: pair.liquidityPoolTokenPriceUSD,
                            },
                        },
                    },
                });
            }
        });

        for (const tokenID of uniqueTokens.values()) {
            const liquidityUSD = this.computeTokenLiquidityUSD(
                tokenID,
                pairs,
                commonTokenIDs,
            );

            bulkOps.push({
                updateOne: {
                    filter: { identifier: tokenID },
                    update: {
                        $set: {
                            liquidityUSD,
                        },
                    },
                },
            });
        }

        await this.bulkUpdateTokens(bulkOps);
    }

    computeTokenPriceDerivedEGLD(
        tokenID: string,
        allPairs: PairModel[],
        egldPriceInUSD: string,
    ): string {
        const memo = new Map<string, string>();
        const doNotVisit = new Set<string>();

        const loadPairsForToken = (id: string): PairModel[] => {
            let tokenPairs = allPairs.filter(
                (pair) =>
                    pair.firstToken.identifier === id ||
                    pair.secondToken.identifier === id,
            );

            if (tokenPairs.length > 1) {
                if (tokenPairs.find((pair) => pair.state === 'Active')) {
                    tokenPairs = tokenPairs.filter(
                        (pair) => pair.state === 'Active',
                    );
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

        const dfs = (id: string): string => {
            if (memo.has(id)) {
                return memo.get(id);
            }

            if (id === tokenProviderUSD) {
                memo.set(id, '1');
                return '1';
            }

            if (id === constantsConfig.USDC_TOKEN_ID) {
                const price = new BigNumber(1)
                    .dividedBy(egldPriceInUSD)
                    .toFixed();
                memo.set(id, price);
                return price;
            }

            const pairs = loadPairsForToken(id);

            let largestLiquidityEGLD = new BigNumber(0);
            let priceSoFar = new BigNumber(0);

            for (const pair of pairs) {
                if (new BigNumber(pair.info.totalSupply).lte(0)) {
                    continue;
                }

                if (pair.firstToken.identifier === id) {
                    const secondTokenDerivedEGLD = dfs(
                        pair.secondToken.identifier,
                    );
                    const egldLocked = new BigNumber(pair.info.reserves1)
                        .times(`1e-${pair.secondToken.decimals}`)
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
                    const firstTokenDerivedEGLD = dfs(
                        pair.firstToken.identifier,
                    );
                    const egldLocked = new BigNumber(pair.info.reserves0)
                        .times(`1e-${pair.firstToken.decimals}`)
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

            memo.set(id, priceSoFar.toFixed());

            return priceSoFar.toFixed();
        };

        return dfs(tokenID);
    }

    computeTokenLiquidityUSD(
        tokenID: string,
        pairs: PairDocument[],
        commonTokenIDs: string[],
    ): string {
        const relevantPairs = pairs.filter(
            (pair) =>
                tokenID === pair.firstToken.identifier ||
                pair.secondToken.identifier === tokenID,
        );

        let newLockedValue = new BigNumber(0);
        for (const pair of relevantPairs) {
            if (
                pair.state === 'Active' ||
                (commonTokenIDs.includes(pair.firstToken.identifier) &&
                    commonTokenIDs.includes(pair.secondToken.identifier))
            ) {
                const tokenLockedValueUSD =
                    tokenID === pair.firstToken.identifier
                        ? pair.firstTokenLockedValueUSD
                        : pair.secondTokenLockedValueUSD;
                newLockedValue = newLockedValue.plus(tokenLockedValueUSD);
                continue;
            }

            if (
                !commonTokenIDs.includes(pair.firstToken.identifier) &&
                !commonTokenIDs.includes(pair.secondToken.identifier)
            ) {
                continue;
            }

            const commonTokenLockedValueUSD = commonTokenIDs.includes(
                pair.firstToken.identifier,
            )
                ? new BigNumber(pair.firstTokenLockedValueUSD)
                : new BigNumber(pair.secondTokenLockedValueUSD);

            newLockedValue = newLockedValue.plus(commonTokenLockedValueUSD);
        }

        return newLockedValue.toFixed();
    }

    getEgldPriceInUSD(pairs: PairDocument[]): string {
        const egldUsdcPair = pairs.find(
            (pair) => pair.address === scAddress.WEGLD_USDC,
        );

        if (!egldUsdcPair) {
            throw new Error(
                'Missing WEGLD/USDC pair. Cannot compute EGLD price in USD',
            );
        }

        return egldUsdcPair.firstTokenPrice;
    }

    async populateEsdtTokenMetadata(
        tokenID: string,
    ): Promise<EsdtTokenDocument> {
        try {
            const tokenMetadata = await this.tokenService.tokenMetadata(
                tokenID,
            );
            const token = await this.upsertToken(tokenMetadata);

            return token;
        } catch (error) {
            return undefined;
        }
    }

    async addToken(token: EsdtToken): Promise<void> {
        try {
            await this.tokenRepository.create(token);
        } catch (error) {
            if (error.name === 'MongoServerError' && error.code === 11000) {
                this.logger.info(
                    `Token ${token.identifier} already persisted`,
                    { context: TokenPersistenceService.name },
                );
            }
            this.logger.error(`Failed insert for ${token.identifier}`);
            this.logger.error(error);

            throw error;
        }
    }

    async upsertToken(
        token: EsdtToken,
        projection: ProjectionType<EsdtToken> = { __v: 0 },
    ): Promise<EsdtTokenDocument> {
        try {
            return this.tokenRepository
                .getModel()
                .findOneAndUpdate({ identifier: token.identifier }, token, {
                    new: true,
                    upsert: true,
                    projection,
                });
        } catch (error) {
            this.logger.error(`Failed upsert for token ${token.identifier}`);
            this.logger.error(error);
            throw error;
        }
    }

    async bulkUpdateTokens(bulkOps: any[]): Promise<void> {
        try {
            const result = await this.tokenRepository
                .getModel()
                .bulkWrite(bulkOps);

            this.logger.info(`Bulk update tokens : ${JSON.stringify(result)}`);
        } catch (error) {
            this.logger.error(error);
        }
    }

    async getFilteredTokens(
        filterQuery: FilterQuery<EsdtTokenDocument>,
        projection?: ProjectionType<EsdtTokenDocument>,
    ): Promise<EsdtTokenDocument[]> {
        return this.tokenRepository
            .getModel()
            .find(filterQuery, projection)
            .exec();
    }
}
