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
import { RouterAbiService } from './router.abi.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import BigNumber from 'bignumber.js';
import { CollectionType } from 'src/modules/common/collection.type';
import { PairsMetadataBuilder } from 'src/modules/pair/services/pair.metadata.builder';
import { SortingOrder } from 'src/modules/common/page.data';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { PairService } from 'src/modules/pair/services/pair.service';

@Injectable()
export class RouterService {
    constructor(
        private readonly routerAbi: RouterAbiService,
        private readonly pairCompute: PairComputeService,
        private readonly cacheService: CacheService,
        private readonly pairService: PairService,
        private readonly pairMetadataBuilder: PairsMetadataBuilder,
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
        const pairsMetadata = await this.routerAbi.pairsMetadata();

        let pairs = await this.pairMetadataBuilder.applyAllFilters(
            pairsMetadata,
            filters,
        );

        if (sorting) {
            pairs = await this.sortPairs(
                pairs,
                sorting.sortField,
                sorting.sortOrder,
            );
        }

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
        const pairsMetadata = await this.routerAbi.pairsMetadata();

        const pairs = await this.pairMetadataBuilder.applyAllFilters(
            pairsMetadata,
            pairFilter,
        );

        return pairs.slice(offset, offset + limit);
    }

    async requireOwner(sender: string) {
        if ((await this.routerAbi.owner()) !== sender)
            throw new Error('You are not the owner.');
    }

    private async sortPairs(
        pairsMetadata: PairModel[],
        sortField: string,
        sortOrder: string,
    ): Promise<PairModel[]> {
        let sortFieldData = [];

        if (!sortField) {
            return pairsMetadata;
        }

        switch (sortField) {
            case PairSortableFields.DEPLOYED_AT:
                sortFieldData = await this.pairService.getAllDeployedAt(
                    pairsMetadata.map((pair) => pair.address),
                );
                break;
            case PairSortableFields.FEES_24:
                sortFieldData = await this.pairCompute.getAllFeesUSD(
                    pairsMetadata.map((pair) => pair.address),
                );
                break;
            case PairSortableFields.TRADES_COUNT:
                sortFieldData = await this.pairService.getAllTradesCount(
                    pairsMetadata.map((pair) => pair.address),
                );
                break;
            case PairSortableFields.TRADES_COUNT_24:
                sortFieldData = await this.pairCompute.getAllTradesCount24h(
                    pairsMetadata.map((pair) => pair.address),
                );
                break;
            case PairSortableFields.TVL:
                sortFieldData = await this.pairService.getAllLockedValueUSD(
                    pairsMetadata.map((pair) => pair.address),
                );
                break;
            case PairSortableFields.VOLUME_24:
                sortFieldData = await this.pairCompute.getAllVolumeUSD(
                    pairsMetadata.map((pair) => pair.address),
                );
                break;
            case PairSortableFields.APR:
                sortFieldData = await Promise.all(
                    pairsMetadata.map((pair) =>
                        this.pairCompute.computeCompoundedApr(pair.address),
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
