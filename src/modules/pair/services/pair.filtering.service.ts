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

        const lpTokensIDs = await Promise.all(
            pairsMetadata.map((pairMetadata) =>
                this.pairAbi.lpTokenID(pairMetadata.address),
            ),
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
        if (pairFilter.address) {
            pairsMetadata = pairsMetadata.filter(
                (pair) => pairFilter.address === pair.address,
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
            pairFilter.searchToken.trim().length < 3
        ) {
            return pairsMetadata;
        }

        const searchTerm = pairFilter.searchToken.toUpperCase().trim();

        const pairsFirstToken = await Promise.all(
            pairsMetadata.map((pairMetadata) =>
                this.pairService.getFirstToken(pairMetadata.address),
            ),
        );
        const pairsSecondToken = await Promise.all(
            pairsMetadata.map((pairMetadata) =>
                this.pairService.getSecondToken(pairMetadata.address),
            ),
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

    async pairsByState(
        pairFilter: PairFilterArgs | PairsFilter,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.state) {
            return pairsMetadata;
        }

        const pairsStates = await Promise.all(
            pairsMetadata.map((pairMetadata) =>
                this.pairAbi.state(pairMetadata.address),
            ),
        );

        const filteredPairsMetadata = [];
        for (let index = 0; index < pairsStates.length; index++) {
            if (pairsStates[index] === pairFilter.state) {
                filteredPairsMetadata.push(pairsMetadata[index]);
            }
        }

        return filteredPairsMetadata;
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

        const pairsFeeStates = await Promise.all(
            pairsMetadata.map((pairMetadata) =>
                this.pairAbi.feeState(pairMetadata.address),
            ),
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

        const pairsVolumes = await Promise.all(
            pairsMetadata.map((pairMetadata) =>
                this.pairCompute.volumeUSD(pairMetadata.address, '24h'),
            ),
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

        const pairsLiquidityUSD = await Promise.all(
            pairsMetadata.map((pairMetadata) =>
                this.pairCompute.lockedValueUSD(pairMetadata.address),
            ),
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

        const pairsTradesCount = await Promise.all(
            pairsMetadata.map((pairMetadata) =>
                this.pairCompute.tradesCount(pairMetadata.address),
            ),
        );

        return pairsMetadata.filter(
            (_, index) => pairsTradesCount[index] >= pairFilter.minTradesCount,
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

        const pairsHasFarms = await Promise.all(
            pairsMetadata.map((pairMetadata) =>
                this.pairCompute.hasFarms(pairMetadata.address),
            ),
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

        const pairsHasDualFarms = await Promise.all(
            pairsMetadata.map((pairMetadata) =>
                this.pairCompute.hasDualFarms(pairMetadata.address),
            ),
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

        const pairsDeployedAt = await Promise.all(
            pairsMetadata.map((pairMetadata) =>
                this.pairCompute.deployedAt(pairMetadata.address),
            ),
        );

        return pairsMetadata.filter(
            (_, index) => pairsDeployedAt[index] >= pairFilter.minDeployedAt,
        );
    }
}
