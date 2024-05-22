import { Injectable } from '@nestjs/common';
import { PairAbiService } from './pair.abi.service';
import { PairComputeService } from './pair.compute.service';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import {
    PairFilterArgs,
    PairsFilter,
} from 'src/modules/router/models/filter.args';
import BigNumber from 'bignumber.js';

@Injectable()
export class PairFilteringService {
    constructor(
        private readonly pairAbi: PairAbiService,
        private readonly pairCompute: PairComputeService,
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

    pairsByAddress(
        pairFilter: PairFilterArgs | PairsFilter,
        pairsMetadata: PairMetadata[],
    ): PairMetadata[] {
        if (pairFilter.address) {
            pairsMetadata = pairsMetadata.filter(
                (pair) => pairFilter.address === pair.address,
            );
        }
        return pairsMetadata;
    }

    pairsByTokens(
        pairFilter: PairFilterArgs | PairsFilter,
        pairsMetadata: PairMetadata[],
    ): PairMetadata[] {
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
        return pairsMetadata;
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
