import { FactoryModel } from '../models/factory.model';
import { Injectable } from '@nestjs/common';
import { scAddress } from '../../../config';
import { PairModel } from '../../pair/models/pair.model';
import { PairMetadata } from '../models/pair.metadata.model';
import {
    PairFilterArgs,
    PairSortingArgs,
    PairsFilter,
} from '../models/filter.args';
import { RouterAbiService } from './router.abi.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import BigNumber from 'bignumber.js';
import { CollectionType } from 'src/modules/common/collection.type';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairPersistenceService } from 'src/modules/persistence/services/pair.persistence.service';

@Injectable()
export class RouterService {
    constructor(
        private readonly routerAbi: RouterAbiService,
        private readonly pairCompute: PairComputeService,
        private readonly pairService: PairService,
        private readonly pairPersistence: PairPersistenceService,
    ) {}

    async getFactory(): Promise<FactoryModel> {
        return new FactoryModel({
            address: scAddress.routerAddress,
        });
    }

    // TODO: remove, not used
    async getPairMetadata(pairAddress: string): Promise<PairMetadata> {
        const pairs = await this.routerAbi.pairsMetadata();
        return pairs.find((pair) => pair.address === pairAddress);
    }

    async getFilteredPairs(
        offset: number,
        limit: number,
        filters: PairsFilter,
        sorting: PairSortingArgs,
    ): Promise<CollectionType<PairModel>> {
        const dbResult = await this.pairPersistence.getFilteredPairs(
            offset,
            limit,
            filters,
            sorting,
        );

        return new CollectionType({
            count: dbResult.count,
            items: dbResult.pairs,
        });
    }

    // TODO: deprecated, remove
    async getAllPairs(
        offset: number,
        limit: number,
        pairFilter: PairFilterArgs,
    ): Promise<PairModel[]> {
        let pairsMetadata = await this.routerAbi.pairsMetadata();
        if (pairFilter.issuedLpToken) {
            pairsMetadata = await this.pairsByIssuedLpToken(pairsMetadata);
        }

        pairsMetadata = this.filterPairsByAddress(pairFilter, pairsMetadata);
        pairsMetadata = this.filterPairsByTokens(pairFilter, pairsMetadata);
        pairsMetadata = await this.filterPairsByState(
            pairFilter,
            pairsMetadata,
        );
        pairsMetadata = await this.filterPairsByFeeState(
            pairFilter,
            pairsMetadata,
        );
        pairsMetadata = await this.filterPairsByVolume(
            pairFilter,
            pairsMetadata,
        );
        pairsMetadata = await this.filterPairsByLockedValueUSD(
            pairFilter,
            pairsMetadata,
        );

        return pairsMetadata
            .map(
                (pairMetadata) =>
                    new PairModel({
                        address: pairMetadata.address,
                    }),
            )
            .slice(offset, offset + limit);
    }

    private filterPairsByAddress(
        pairFilter: PairFilterArgs,
        pairsMetadata: PairMetadata[],
    ): PairMetadata[] {
        if (pairFilter.addresses) {
            pairsMetadata = pairsMetadata.filter((pair) =>
                pairFilter.addresses.includes(pair.address),
            );
        }
        return pairsMetadata;
    }

    private filterPairsByTokens(
        pairFilter: PairFilterArgs,
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

    private async pairsByIssuedLpToken(
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        return this.filterPairsByIssuedLpTokenRaw(pairsMetadata);
    }

    private async filterPairsByIssuedLpTokenRaw(
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        const lpTokensIDs = await this.pairService.getAllLpTokensIds(
            pairsMetadata.map((pair) => pair.address),
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

    private async filterPairsByState(
        pairFilter: PairFilterArgs,
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        if (!pairFilter.state) {
            return pairsMetadata;
        }

        const pairsStates = await this.pairService.getAllStates(
            pairsMetadata.map((pair) => pair.address),
        );

        const filteredPairsMetadata = [];
        for (let index = 0; index < pairsStates.length; index++) {
            if (pairsStates[index] === pairFilter.state) {
                filteredPairsMetadata.push(pairsMetadata[index]);
            }
        }

        return filteredPairsMetadata;
    }

    private async filterPairsByFeeState(
        pairFilter: PairFilterArgs,
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

    private async filterPairsByVolume(
        pairFilter: PairFilterArgs,
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

    private async filterPairsByLockedValueUSD(
        pairFilter: PairFilterArgs,
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

    async requireOwner(sender: string) {
        if ((await this.routerAbi.owner()) !== sender)
            throw new Error('You are not the owner.');
    }
}
