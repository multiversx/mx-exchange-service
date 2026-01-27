import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairInfoModel } from 'src/modules/pair/models/pair-info.model';
import {
    PairCompoundedAPRModel,
    PairModel,
} from 'src/modules/pair/models/pair.model';
import { EsdtTokenType } from 'src/modules/tokens/models/esdtToken.model';
import {
    AddPairLpTokenRequest,
    AddPairRequest,
    GetFilteredPairsRequest,
    GetPairsAndTokensRequest,
    PaginatedPairs,
    PairAndTokens,
    Pairs,
    PairsAndTokensResponse,
    PairSortField,
    UpdatePairsRequest,
    UpdatePairsResponse,
} from '../../interfaces/dex_state.interfaces';
import { sortKeysByField } from '../../utils/sort.utils';
import { StateStore } from '../state.store';
import { TokensStateHandler } from './tokens.state.handler';

const PAIR_SORT_FIELD_MAP = {
    [PairSortField.PAIRS_SORT_DEPLOYED_AT]: 'deployedAt',
    [PairSortField.PAIRS_SORT_FEES]: 'feesUSD24h',
    [PairSortField.PAIRS_SORT_TRADES_COUNT]: 'tradesCount',
    [PairSortField.PAIRS_SORT_TRADES_COUNT_24H]: 'tradesCount24h',
    [PairSortField.PAIRS_SORT_TVL]: 'lockedValueUSD',
    [PairSortField.PAIRS_SORT_VOLUME]: 'volumeUSD24h',
    [PairSortField.PAIRS_SORT_APR]: 'compoundedAprValue',
};

@Injectable()
export class PairsStateHandler {
    constructor(
        private readonly stateStore: StateStore,
        private readonly tokensHandler: TokensStateHandler,
    ) {}

    getPairs(addresses: string[], fields: string[] = []): Pairs {
        const result: Pairs = {
            pairs: [],
        };

        for (const address of addresses) {
            const statePair = this.stateStore.pairs.get(address);

            if (!statePair) {
                throw new Error(`Pair ${address} not found`);
            }

            if (fields.length === 0) {
                result.pairs.push({ ...statePair });
                continue;
            }

            const pair: Partial<PairModel> = {};
            for (const field of fields) {
                pair[field] = statePair[field];
            }

            result.pairs.push(pair as PairModel);
        }

        return result;
    }

    getAllPairs(fields: string[] = []): Pairs {
        return this.getPairs(Array.from(this.stateStore.pairs.keys()), fields);
    }

    getFilteredPairs(request: GetFilteredPairsRequest): PaginatedPairs {
        const fields = request.fields?.paths ?? [];
        const {
            addresses,
            issuedLpToken,
            lpTokenIds,
            firstTokenID,
            secondTokenID,
            searchToken,
            state,
            feeState,
            hasFarms,
            hasDualFarms,
            minVolume,
            minLockedValueUSD,
            minTradesCount,
            minTradesCount24h,
            minDeployedAt,
            offset,
            limit,
            sortField,
            sortOrder,
        } = request;

        let minVolumeBN: BigNumber;
        let minLockedValueBN: BigNumber;

        if (minVolume) {
            minVolumeBN = new BigNumber(minVolume);
        }

        if (minLockedValueUSD) {
            minLockedValueBN = new BigNumber(minLockedValueUSD);
        }

        const pairAddresses: string[] = [];
        this.stateStore.pairs.forEach((pair) => {
            if (issuedLpToken && !pair.liquidityPoolTokenId) {
                return;
            }

            if (addresses && !addresses.includes(pair.address)) {
                return;
            }

            if (
                lpTokenIds &&
                pair.liquidityPoolTokenId &&
                !lpTokenIds.includes(pair.liquidityPoolTokenId)
            ) {
                return;
            }

            if (firstTokenID && secondTokenID) {
                if (
                    ![firstTokenID, secondTokenID].includesEvery([
                        pair.firstTokenId,
                        pair.secondTokenId,
                    ])
                ) {
                    return;
                }
            } else if (firstTokenID && pair.firstTokenId !== firstTokenID) {
                return;
            } else if (secondTokenID && pair.secondTokenId !== secondTokenID) {
                return;
            }

            if (state && !state.includes(pair.state)) {
                return;
            }

            if (feeState !== undefined && pair.feeState !== feeState) {
                return;
            }

            if (hasFarms !== undefined && pair.hasFarms !== hasFarms) {
                return;
            }

            if (
                hasDualFarms !== undefined &&
                pair.hasDualFarms !== hasDualFarms
            ) {
                return;
            }

            if (minVolumeBN && minVolumeBN.gt(pair.volumeUSD24h)) {
                return;
            }

            if (minLockedValueBN && minLockedValueBN.gt(pair.lockedValueUSD)) {
                return;
            }

            if (minTradesCount && minTradesCount > pair.tradesCount) {
                return;
            }

            if (minTradesCount24h && minTradesCount24h > pair.tradesCount24h) {
                return;
            }

            if (minDeployedAt && minDeployedAt > pair.deployedAt) {
                return;
            }

            if (searchToken && searchToken.trim().length > 0) {
                const firstToken = this.stateStore.tokens.get(
                    pair.firstTokenId,
                );
                const secondToken = this.stateStore.tokens.get(
                    pair.secondTokenId,
                );
                const searchTerm = searchToken.toUpperCase().trim();

                if (
                    !firstToken.name.toUpperCase().includes(searchTerm) &&
                    !firstToken.identifier.toUpperCase().includes(searchTerm) &&
                    !firstToken.ticker.toUpperCase().includes(searchTerm) &&
                    !secondToken.name.toUpperCase().includes(searchTerm) &&
                    !secondToken.identifier
                        .toUpperCase()
                        .includes(searchTerm) &&
                    !secondToken.ticker.toUpperCase().includes(searchTerm)
                ) {
                    return;
                }
            }

            pairAddresses.push(pair.address);
        });

        if (sortField === PairSortField.PAIRS_SORT_UNSPECIFIED) {
            const { pairs } = this.getPairs(
                pairAddresses.slice(offset, offset + limit),
                fields,
            );

            return {
                count: pairAddresses.length,
                pairs,
            };
        }

        const decodedSortField = PAIR_SORT_FIELD_MAP[sortField];

        const sortedAddresses = sortKeysByField(
            pairAddresses,
            this.stateStore.pairs,
            decodedSortField,
            sortOrder,
        );

        const { pairs } = this.getPairs(
            sortedAddresses.slice(offset, offset + limit),
            fields,
        );

        return {
            count: sortedAddresses.length,
            pairs,
        };
    }

    getPairsCount(): number {
        return this.stateStore.pairs.size;
    }

    getPairsTokens(request: GetPairsAndTokensRequest): PairsAndTokensResponse {
        const { addresses, pairFields, tokenFields } = request;

        const pairTokenFields = [
            'firstTokenId',
            'secondTokenId',
            'liquidityPoolTokenId',
        ];

        const pairFieldsIncludingTokenIds = pairFields?.paths ?? [];
        const pairFieldsToRemove: string[] = [];

        if (pairFieldsIncludingTokenIds.length) {
            pairTokenFields.forEach((field) => {
                if (!pairFieldsIncludingTokenIds.includes(field)) {
                    pairFieldsIncludingTokenIds.push(field);
                    pairFieldsToRemove.push(field);
                }
            });
        }

        const { pairs } = this.getPairs(addresses, pairFieldsIncludingTokenIds);

        const { tokens: firstTokens } = this.tokensHandler.getTokens(
            pairs.map((pair) => pair.firstTokenId),
            tokenFields?.paths ?? [],
        );
        const { tokens: secondTokens } = this.tokensHandler.getTokens(
            pairs.map((pair) => pair.secondTokenId),
            tokenFields?.paths ?? [],
        );
        const { tokens: lpTokens } = this.tokensHandler.getTokens(
            pairs.map((pair) => pair.liquidityPoolTokenId),
            tokenFields?.paths ?? [],
        );

        const pairsWithTokens: PairAndTokens[] = pairs.map((pair, index) => {
            const responsePair = { ...pair };

            if (pairFieldsToRemove.length) {
                pairFieldsToRemove.forEach((field) => {
                    delete responsePair[field];
                });
            }
            return {
                pair: responsePair,
                firstToken: firstTokens[index],
                secondToken: secondTokens[index],
                ...(lpTokens[index] && { lpToken: lpTokens[index] }),
            };
        });

        return { pairsWithTokens };
    }

    addPair(request: AddPairRequest): void {
        const { pair, firstToken, secondToken } = request;

        pair.compoundedAPR = new PairCompoundedAPRModel({
            feesAPR: pair.feesAPR,
            farmBaseAPR: '0',
            farmBoostedAPR: '0',
            dualFarmBaseAPR: '0',
            dualFarmBoostedAPR: '0',
        });

        this.stateStore.setPair(pair.address, { ...pair });

        if (!this.stateStore.tokens.has(firstToken.identifier)) {
            this.stateStore.setToken(firstToken.identifier, { ...firstToken });
            this.stateStore.addTokenByType(
                firstToken.type as EsdtTokenType,
                firstToken.identifier,
            );
        }

        if (!this.stateStore.tokens.has(secondToken.identifier)) {
            this.stateStore.setToken(secondToken.identifier, {
                ...secondToken,
            });
            this.stateStore.addTokenByType(
                secondToken.type as EsdtTokenType,
                secondToken.identifier,
            );
        }

        this.stateStore.addTokenPair(pair.firstTokenId, pair.address);
        this.stateStore.addTokenPair(pair.secondTokenId, pair.address);

        if (pair.state === 'Active') {
            this.stateStore.addActivePair(pair.address);
            this.stateStore.addActivePairsToken(pair.firstTokenId);
            this.stateStore.addActivePairsToken(pair.secondTokenId);
        }
    }

    addPairLpToken(request: AddPairLpTokenRequest): void {
        const { address, token } = request;

        const pair = this.stateStore.pairs.get(address);

        if (!pair) {
            throw new Error(`Pair ${address} not found`);
        }

        const updatedPair = { ...pair };
        updatedPair.liquidityPoolTokenId = token.identifier;

        this.stateStore.setToken(token.identifier, { ...token });
        this.stateStore.setPair(address, updatedPair);
    }

    updatePairs(request: UpdatePairsRequest): UpdatePairsResponse {
        const { pairs: partialPairs, updateMask } = request;

        const updatedPairs = new Map<string, PairModel>();
        const failedAddresses: string[] = [];

        const nonUpdateableFields = [
            'address',
            'firstTokenId',
            'secondTokenId',
            'liquidityPoolTokenId',
        ];

        for (const partial of partialPairs) {
            if (!partial.address) {
                continue;
            }

            const pair = this.stateStore.pairs.get(partial.address);

            if (!pair) {
                failedAddresses.push(partial.address);
                continue;
            }

            const updatedPair = { ...pair };

            for (const field of updateMask.paths) {
                if (partial[field] === undefined) {
                    continue;
                }

                if (nonUpdateableFields.includes(field)) {
                    continue;
                }

                if (field === 'info') {
                    const currentReserves: PairInfoModel = {
                        reserves0:
                            partial.info.reserves0 ?? pair.info.reserves0,
                        reserves1:
                            partial.info.reserves1 ?? pair.info.reserves1,
                        totalSupply:
                            partial.info.totalSupply ?? pair.info.totalSupply,
                    };
                    updatedPair.info = currentReserves;
                } else {
                    updatedPair[field] = partial[field];
                }
            }

            updatedPairs.set(partial.address, updatedPair);
        }

        if (updatedPairs.size > 0) {
            updatedPairs.forEach((pair, address) => {
                this.stateStore.setPair(address, pair);
            });
        }

        return {
            failedAddresses,
            tokensWithPriceUpdates: [],
            updatedCount: updatedPairs.size,
        };
    }
}
