import { Injectable } from '@nestjs/common';
import { PairAbiService } from './pair.abi.service';
import { PairComputeService } from './pair.compute.service';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import {
    PairFilterArgs,
    PairsFilter,
} from 'src/modules/router/models/filter.args';
import BigNumber from 'bignumber.js';
import { PairService } from './pair.service';

@Injectable()
export class PairFilteringService {
    constructor(
        private readonly pairAbi: PairAbiService,
        private readonly pairCompute: PairComputeService,
        private readonly pairService: PairService,
    ) {}

    async pairsByIssuedLpToken(
        pairFilter: PairFilterArgs | PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.issuedLpToken) {
            return pairsMetadata;
        }

        const lpTokensIDs = await this.pairService.getAllLpTokensIds(
            pairsMetadata.map((pairMetadata) => pairMetadata.address),
        );

        const filteredPairsMetadata = [];
        for (let index = 0; index < lpTokensIDs.length; index++) {
            if (
                lpTokensIDs[index] === undefined ||
                lpTokensIDs[index] === 'undefined' ||
                lpTokensIDs[index] === ''
            ) {
                continue;
            }
            filteredPairsMetadata.push(pairsMetadata[index]);
        }

        return filteredPairsMetadata;
    }

    async pairsByAddress(
        pairFilter: PairFilterArgs | PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (pairFilter.addresses) {
            pairsMetadata = pairsMetadata.filter((pair) =>
                pairFilter.addresses.includes(pair.address),
            );
        }
        return await Promise.resolve(pairsMetadata);
    }

    async pairsByTokens(
        pairFilter: PairFilterArgs | PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (pairFilter.firstTokenID) {
            if (pairFilter.secondTokenID) {
                pairsMetadata = pairsMetadata.filter(
                    (pair) =>
                        (pairFilter.firstTokenID === pair.firstTokenID &&
                            pairFilter.secondTokenID === pair.secondTokenID) ||
                        (pairFilter.firstTokenID === pair.secondTokenID &&
                            pairFilter.secondTokenID === pair.firstTokenID),
                );
            } else {
                pairsMetadata = pairsMetadata.filter(
                    (pair) => pairFilter.firstTokenID === pair.firstTokenID,
                );
            }
        } else if (pairFilter.secondTokenID) {
            pairsMetadata = pairsMetadata.filter(
                (pair) => pairFilter.secondTokenID === pair.secondTokenID,
            );
        }
        return await Promise.resolve(pairsMetadata);
    }

    async pairsByWildcardToken(
        pairFilter: PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (
            !pairFilter.searchToken ||
            pairFilter.searchToken.trim().length < 1
        ) {
            return pairsMetadata;
        }

        const searchTerm = pairFilter.searchToken.toUpperCase().trim();
        const pairsAddresses = pairsMetadata.map(
            (pairMetadata) => pairMetadata.address,
        );

        const pairsFirstToken = await this.pairService.getAllFirstTokens(
            pairsAddresses,
        );
        const pairsSecondToken = await this.pairService.getAllSecondTokens(
            pairsAddresses,
        );

        const filteredPairs: PairMetadata[] = [];
        for (const [index, pair] of pairsMetadata.entries()) {
            const firstToken = pairsFirstToken[index];
            const secondToken = pairsSecondToken[index];

            if (
                firstToken.name.toUpperCase().includes(searchTerm) ||
                firstToken.identifier.toUpperCase().includes(searchTerm) ||
                firstToken.ticker.toUpperCase().includes(searchTerm) ||
                secondToken.name.toUpperCase().includes(searchTerm) ||
                secondToken.identifier.toUpperCase().includes(searchTerm) ||
                secondToken.ticker.toUpperCase().includes(searchTerm)
            ) {
                filteredPairs.push(pair);
            }
        }

        return filteredPairs;
    }

    async pairsByLpTokenIds(
        pairFilter: PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.lpTokenIds || pairFilter.lpTokenIds.length === 0) {
            return pairsMetadata;
        }

        const lpTokensIDs = await this.pairService.getAllLpTokensIds(
            pairsMetadata.map((pairMetadata) => pairMetadata.address),
        );

        return pairsMetadata.filter((_, index) =>
            pairFilter.lpTokenIds.includes(lpTokensIDs[index]),
        );
    }

    async pairsByFarmTokens(
        pairFilter: PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.farmTokens || pairFilter.farmTokens.length === 0) {
            return pairsMetadata;
        }

        const farmTokens = await Promise.all(
            pairsMetadata.map((pairMetadata) =>
                this.pairCompute.getPairFarmToken(pairMetadata.address),
            ),
        );

        return pairsMetadata.filter(
            (_, index) =>
                farmTokens[index] &&
                pairFilter.farmTokens.includes(farmTokens[index]),
        );
    }

    async pairsByState(
        pairFilter: PairFilterArgs | PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.state || pairFilter.state.length === 0) {
            return pairsMetadata;
        }

        const pairsStates = await this.pairService.getAllStates(
            pairsMetadata.map((pair) => pair.address),
        );

        return pairsMetadata.filter((_, index) => {
            if (!Array.isArray(pairFilter.state)) {
                return pairsStates[index] === pairFilter.state;
            }

            return pairFilter.state.includes(pairsStates[index]);
        });
    }

    async pairsByFeeState(
        pairFilter: PairFilterArgs | PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (
            typeof pairFilter.feeState === 'undefined' ||
            pairFilter.feeState === null
        ) {
            return pairsMetadata;
        }

        const pairsFeeStates = await this.pairService.getAllFeeStates(
            pairsMetadata.map((pair) => pair.address),
        );

        return pairsMetadata.filter(
            (_, index) => pairsFeeStates[index] === pairFilter.feeState,
        );
    }

    async pairsByVolume(
        pairFilter: PairFilterArgs | PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.minVolume) {
            return pairsMetadata;
        }

        const pairsVolumes = await this.pairCompute.getAllVolumeUSD(
            pairsMetadata.map((pair) => pair.address),
        );

        return pairsMetadata.filter((_, index) => {
            const volume = new BigNumber(pairsVolumes[index]);
            return volume.gte(pairFilter.minVolume);
        });
    }

    async pairsByLockedValueUSD(
        pairFilter: PairFilterArgs | PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.minLockedValueUSD) {
            return pairsMetadata;
        }

        const pairsLiquidityUSD = await this.pairService.getAllLockedValueUSD(
            pairsMetadata.map((pair) => pair.address),
        );

        return pairsMetadata.filter((_, index) => {
            const lockedValueUSD = new BigNumber(pairsLiquidityUSD[index]);
            return lockedValueUSD.gte(pairFilter.minLockedValueUSD);
        });
    }

    async pairsByTradesCount(
        pairFilter: PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.minTradesCount) {
            return pairsMetadata;
        }

        const pairsTradesCount = await this.pairService.getAllTradesCount(
            pairsMetadata.map((pair) => pair.address),
        );

        return pairsMetadata.filter(
            (_, index) => pairsTradesCount[index] >= pairFilter.minTradesCount,
        );
    }

    async pairsByTradesCount24h(
        pairFilter: PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.minTradesCount24h) {
            return pairsMetadata;
        }

        const pairsTradesCount24h = await this.pairCompute.getAllTradesCount24h(
            pairsMetadata.map((pair) => pair.address),
        );

        return pairsMetadata.filter(
            (_, index) =>
                pairsTradesCount24h[index] >= pairFilter.minTradesCount24h,
        );
    }

    async pairsByHasFarms(
        pairFilter: PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (
            typeof pairFilter.hasFarms === 'undefined' ||
            pairFilter.hasFarms === null
        ) {
            return pairsMetadata;
        }

        const pairsHasFarms = await this.pairService.getAllHasFarms(
            pairsMetadata.map((pair) => pair.address),
        );

        return pairsMetadata.filter(
            (_, index) => pairsHasFarms[index] === pairFilter.hasFarms,
        );
    }

    async pairsByHasDualFarms(
        pairFilter: PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (
            typeof pairFilter.hasDualFarms === 'undefined' ||
            pairFilter.hasDualFarms === null
        ) {
            return pairsMetadata;
        }

        const pairsHasDualFarms = await this.pairService.getAllHasDualFarms(
            pairsMetadata.map((pair) => pair.address),
        );

        return pairsMetadata.filter(
            (_, index) => pairsHasDualFarms[index] === pairFilter.hasDualFarms,
        );
    }

    async pairsByDeployedAt(
        pairFilter: PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.minDeployedAt) {
            return pairsMetadata;
        }

        const pairsDeployedAt = await this.pairService.getAllDeployedAt(
            pairsMetadata.map((pair) => pair.address),
        );

        return pairsMetadata.filter(
            (_, index) => pairsDeployedAt[index] >= pairFilter.minDeployedAt,
        );
    }
}
