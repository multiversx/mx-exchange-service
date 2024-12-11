import {
    PairFilterArgs,
    PairsFilter,
} from 'src/modules/router/models/filter.args';
import BigNumber from 'bignumber.js';
import { PairModel } from '../models/pair.model';

export class PairFilteringService {
    static pairsByIssuedLpToken(
        filters: PairFilterArgs | PairsFilter,
        pairs: PairModel[],
    ): PairModel[] {
        if (!filters.issuedLpToken) {
            return pairs;
        }

        return pairs.filter((pair) => pair.liquidityPoolToken !== undefined);
    }

    static pairsByAddress(
        filters: PairFilterArgs | PairsFilter,
        pairs: PairModel[],
    ): PairModel[] {
        if (!filters.addresses || filters.addresses.length === 0) {
            return pairs;
        }

        return pairs.filter((pair) => filters.addresses.includes(pair.address));
    }

    static pairsByTokens(
        filters: PairFilterArgs | PairsFilter,
        pairs: PairModel[],
    ): PairModel[] {
        if (filters instanceof PairsFilter) {
            pairs = PairFilteringService.pairsByWildcardToken(filters, pairs);
        }

        if (filters.firstTokenID) {
            if (filters.secondTokenID) {
                pairs = pairs.filter(
                    (pair) =>
                        (pair.firstToken.identifier === filters.firstTokenID &&
                            pair.secondToken.identifier ===
                                filters.secondTokenID) ||
                        (pair.firstToken.identifier === filters.secondTokenID &&
                            pair.secondToken.identifier ===
                                filters.firstTokenID),
                );
            } else {
                pairs = pairs.filter(
                    (pair) =>
                        pair.firstToken.identifier === filters.firstTokenID,
                );
            }
        } else if (filters.secondTokenID) {
            pairs = pairs.filter(
                (pair) => pair.secondToken.identifier === filters.secondTokenID,
            );
        }

        return pairs;
    }

    static pairsByWildcardToken(
        filters: PairsFilter,
        pairs: PairModel[],
    ): PairModel[] {
        if (!filters.searchToken || filters.searchToken.trim().length < 3) {
            return pairs;
        }

        const searchTerm = filters.searchToken.toUpperCase().trim();

        return pairs.filter(
            (pair) =>
                pair.firstToken.name.toUpperCase().includes(searchTerm) ||
                pair.firstToken.identifier.toUpperCase().includes(searchTerm) ||
                pair.firstToken.ticker.toUpperCase().includes(searchTerm) ||
                pair.secondToken.name.toUpperCase().includes(searchTerm) ||
                pair.secondToken.identifier
                    .toUpperCase()
                    .includes(searchTerm) ||
                pair.secondToken.ticker.toUpperCase().includes(searchTerm),
        );
    }

    static pairsByLpTokenIds(
        filters: PairsFilter,
        pairs: PairModel[],
    ): PairModel[] {
        if (!filters.lpTokenIds || filters.lpTokenIds.length === 0) {
            return pairs;
        }

        return pairs.filter(
            (pair) =>
                pair.liquidityPoolToken !== undefined &&
                filters.lpTokenIds.includes(pair.liquidityPoolToken.identifier),
        );
    }

    static pairsByFarmTokens(
        filters: PairsFilter,
        pairs: PairModel[],
        farmTokens: string[],
    ): PairModel[] {
        if (!filters.farmTokens || filters.farmTokens.length === 0) {
            return pairs;
        }

        return pairs.filter(
            (_, index) =>
                farmTokens[index] &&
                filters.farmTokens.includes(farmTokens[index]),
        );
    }

    static pairsByState(
        filters: PairFilterArgs | PairsFilter,
        pairs: PairModel[],
    ): PairModel[] {
        if (
            !filters.state ||
            (Array.isArray(filters.state) && filters.state.length === 0)
        ) {
            return pairs;
        }

        return pairs.filter((pair) => {
            if (!Array.isArray(filters.state)) {
                return pair.state === filters.state;
            }

            return filters.state.includes(pair.state);
        });
    }

    static pairsByFeeState(
        filters: PairFilterArgs | PairsFilter,
        pairs: PairModel[],
    ): PairModel[] {
        if (
            typeof filters.feeState === 'undefined' ||
            filters.feeState === null
        ) {
            return pairs;
        }

        return pairs.filter((pair) => pair.feeState === filters.feeState);
    }

    static pairsByVolume(
        filters: PairFilterArgs | PairsFilter,
        pairs: PairModel[],
    ): PairModel[] {
        if (!filters.minVolume) {
            return pairs;
        }

        return pairs.filter((pair) => {
            return new BigNumber(pair.volumeUSD24h).gte(filters.minVolume);
        });
    }

    static pairsByLockedValueUSD(
        filters: PairFilterArgs | PairsFilter,
        pairs: PairModel[],
    ): PairModel[] {
        if (!filters.minLockedValueUSD) {
            return pairs;
        }

        return pairs.filter((pair) => {
            return new BigNumber(pair.lockedValueUSD).gte(
                filters.minLockedValueUSD,
            );
        });
    }

    static pairsByTradesCount(
        filters: PairsFilter,
        pairs: PairModel[],
    ): PairModel[] {
        if (!filters.minTradesCount) {
            return pairs;
        }

        return pairs.filter(
            (pair) => pair.tradesCount >= filters.minTradesCount,
        );
    }

    static pairsByTradesCount24h(
        filters: PairsFilter,
        pairs: PairModel[],
    ): PairModel[] {
        if (!filters.minTradesCount24h) {
            return pairs;
        }

        return pairs.filter(
            (pair) => pair.tradesCount24h >= filters.minTradesCount24h,
        );
    }

    static pairsByHasFarms(
        filters: PairsFilter,
        pairs: PairModel[],
    ): PairModel[] {
        if (
            typeof filters.hasFarms === 'undefined' ||
            filters.hasFarms === null
        ) {
            return pairs;
        }

        return pairs.filter((pair) => pair.hasFarms === filters.hasFarms);
    }

    static pairsByHasDualFarms(
        filters: PairsFilter,
        pairs: PairModel[],
    ): PairModel[] {
        if (
            typeof filters.hasDualFarms === 'undefined' ||
            filters.hasDualFarms === null
        ) {
            return pairs;
        }

        return pairs.filter(
            (pair) => pair.hasDualFarms === filters.hasDualFarms,
        );
    }

    static pairsByDeployedAt(
        filters: PairsFilter,
        pairs: PairModel[],
    ): PairModel[] {
        if (!filters.minDeployedAt) {
            return pairs;
        }

        return pairs.filter((pair) => pair.deployedAt >= filters.minDeployedAt);
    }
}
