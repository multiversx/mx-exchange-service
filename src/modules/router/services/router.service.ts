import { FactoryModel } from '../models/factory.model';
import { Injectable } from '@nestjs/common';
import { scAddress } from '../../../config';
import { PairModel } from '../../pair/models/pair.model';
import { PairMetadata } from '../models/pair.metadata.model';
import {
    PairFilterArgs,
    PairSortableFields,
    PairSortingArgs,
    PairsFilter,
} from '../models/filter.args';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { RouterAbiService } from './router.abi.service';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import BigNumber from 'bignumber.js';
import { CollectionType } from 'src/modules/common/collection.type';
import { PairsMetadataBuilder } from 'src/modules/pair/services/pair.metadata.builder';
import { PairFilteringService } from 'src/modules/pair/services/pair.filtering.service';
import { SortingOrder } from 'src/modules/common/page.data';

@Injectable()
export class RouterService {
    constructor(
        private readonly pairAbi: PairAbiService,
        private readonly routerAbi: RouterAbiService,
        private readonly pairCompute: PairComputeService,
        private readonly pairFilteringService: PairFilteringService,
    ) {}

    async getFactory(): Promise<FactoryModel> {
        return new FactoryModel({
            address: scAddress.routerAddress,
        });
    }

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
        let pairsMetadata = await this.routerAbi.pairsMetadata();

        const builder = new PairsMetadataBuilder(
            pairsMetadata,
            filters,
            this.pairFilteringService,
        );

        await builder.applyAllFilters();

        pairsMetadata = await builder.build();

        if (sorting) {
            pairsMetadata = await this.sortPairs(
                pairsMetadata,
                sorting.sortField,
                sorting.sortOrder,
            );
        }

        const pairs = pairsMetadata.map(
            (pairMetadata) =>
                new PairModel({
                    address: pairMetadata.address,
                }),
        );

        return new CollectionType({
            count: pairs.length,
            items: pairs.slice(offset, offset + limit),
        });
    }

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
        if (pairFilter.address) {
            pairsMetadata = pairsMetadata.filter(
                (pair) => pairFilter.address === pair.address,
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

    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneSecond() * 30,
        localTtl: Constants.oneSecond() * 6,
    })
    private async pairsByIssuedLpToken(
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        return await this.filterPairsByIssuedLpTokenRaw(pairsMetadata);
    }

    private async filterPairsByIssuedLpTokenRaw(
        pairsMetadata: PairMetadata[],
    ): Promise<PairMetadata[]> {
        const promises = pairsMetadata.map((pairMetadata) =>
            this.pairAbi.lpTokenID(pairMetadata.address),
        );
        const lpTokensIDs = await Promise.all(promises);

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

        const promises = pairsMetadata.map((pairMetadata) =>
            this.pairAbi.state(pairMetadata.address),
        );
        const pairsStates = await Promise.all(promises);

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

        const pairsFeeStates = await Promise.all(
            pairsMetadata.map((pairMetadata) =>
                this.pairAbi.feeState(pairMetadata.address),
            ),
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

    private async filterPairsByLockedValueUSD(
        pairFilter: PairFilterArgs,
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

    async requireOwner(sender: string) {
        if ((await this.routerAbi.owner()) !== sender)
            throw new Error('You are not the owner.');
    }

    private async sortPairs(
        pairsMetadata: PairMetadata[],
        sortField: string,
        sortOrder: string,
    ): Promise<PairMetadata[]> {
        let sortFieldData = [];

        switch (sortField) {
            case PairSortableFields.DEPLOYED_AT:
                sortFieldData = await Promise.all(
                    pairsMetadata.map((pair) =>
                        this.pairCompute.deployedAt(pair.address),
                    ),
                );
                break;
            case PairSortableFields.FEES_24:
                sortFieldData = await Promise.all(
                    pairsMetadata.map((pair) =>
                        this.pairCompute.feesUSD(pair.address, '24h'),
                    ),
                );
                break;
            case PairSortableFields.TRADES_COUNT:
                sortFieldData = await Promise.all(
                    pairsMetadata.map((pair) =>
                        this.pairCompute.tradesCount(pair.address),
                    ),
                );
                break;
            case PairSortableFields.TVL:
                sortFieldData = await Promise.all(
                    pairsMetadata.map((pair) =>
                        this.pairCompute.lockedValueUSD(pair.address),
                    ),
                );
                break;
            case PairSortableFields.VOLUME_24:
                sortFieldData = await Promise.all(
                    pairsMetadata.map((pair) =>
                        this.pairCompute.volumeUSD(pair.address, '24h'),
                    ),
                );
                break;
            default:
                break;
        }

        const combined = pairsMetadata.map((pair, index) => ({
            pair,
            sortValue: new BigNumber(sortFieldData[index]),
        }));

        combined.sort((a, b) => {
            if (sortOrder === SortingOrder.ASC) {
                return a.sortValue.comparedTo(b.sortValue);
            }

            return b.sortValue.comparedTo(a.sortValue);
        });

        return combined.map((item) => item.pair);
    }
}
