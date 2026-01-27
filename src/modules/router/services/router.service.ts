import { FactoryModel } from '../models/factory.model';
import { Injectable } from '@nestjs/common';
import { scAddress } from '../../../config';
import { PairModel } from '../../pair/models/pair.model';
import {
    PairFilterArgs,
    PairSortingArgs,
    PairsFilter,
} from '../models/filter.args';
import { RouterAbiService } from './router.abi.service';
import { CollectionType } from 'src/modules/common/collection.type';
import { PairsStateService } from 'src/modules/state/services/pairs.state.service';

@Injectable()
export class RouterService {
    constructor(
        private readonly routerAbi: RouterAbiService,
        private readonly pairsState: PairsStateService,
    ) {}

    async getFactory(): Promise<FactoryModel> {
        return new FactoryModel({
            address: scAddress.routerAddress,
        });
    }

    async getFilteredPairs(
        offset: number,
        limit: number,
        filters: PairsFilter,
        sorting: PairSortingArgs,
    ): Promise<CollectionType<PairModel>> {
        const result = await this.pairsState.getFilteredPairs(
            offset,
            limit,
            filters,
            sorting,
        );

        return new CollectionType({
            count: result.count,
            items: result.pairs,
        });
    }

    async getAllPairs(
        offset: number,
        limit: number,
        pairFilter: PairFilterArgs,
    ): Promise<PairModel[]> {
        const filters = new PairsFilter();

        filters.issuedLpToken = pairFilter.issuedLpToken;
        filters.addresses = pairFilter.addresses ?? undefined;
        filters.firstTokenID = pairFilter.firstTokenID ?? undefined;
        filters.secondTokenID = pairFilter.secondTokenID ?? undefined;
        filters.state = pairFilter.state ? [pairFilter.state] : undefined;
        filters.minVolume = pairFilter.minVolume ?? undefined;
        filters.feeState = pairFilter.feeState ?? undefined;
        filters.minLockedValueUSD = pairFilter.minLockedValueUSD ?? undefined;

        const result = await this.pairsState.getFilteredPairs(
            offset,
            limit,
            filters,
        );

        return result.pairs;
    }

    async requireOwner(sender: string) {
        if ((await this.routerAbi.owner()) !== sender)
            throw new Error('You are not the owner.');
    }
}
