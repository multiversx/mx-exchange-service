import { Injectable, Scope } from '@nestjs/common';
import { PairAbiService } from './pair.abi.service';
import DataLoader from 'dataloader';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairService } from './pair.service';
import { PairInfoModel } from '../models/pair-info.model';
import { getAllKeys } from 'src/utils/get.many.utils';
import { constantsConfig } from 'src/config';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable({
    scope: Scope.REQUEST,
})
export class PairAbiLoader {
    constructor(
        private readonly pairAbi: PairAbiService,
        private readonly pairService: PairService,
        private readonly cacheService: CacheService,
    ) {}

    public readonly firstTokenLoader = new DataLoader<string, EsdtToken>(
        async (addresses: string[]) => {
            return this.pairService.getAllFirstTokens(addresses);
        },
    );

    public readonly secondTokenLoader = new DataLoader<string, EsdtToken>(
        async (addresses: string[]) => {
            return this.pairService.getAllSecondTokens(addresses);
        },
    );

    public readonly liquidityPoolTokenLoader = new DataLoader<
        string,
        EsdtToken
    >(async (addresses: string[]) => {
        return this.pairService.getAllLpTokens(addresses);
    });

    public readonly infoMetadataLoader = new DataLoader<string, PairInfoModel>(
        async (addresses: string[]) => {
            return this.pairAbi.getAllPairsInfoMetadata(addresses);
        },
    );

    public readonly totalFeePercentLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return getAllKeys<number>(
                this.cacheService,
                addresses,
                'pair.totalFeePercent',
                this.pairAbi.totalFeePercent.bind(this.pairAbi),
                CacheTtlInfo.ContractState,
            );
        },
    );

    public readonly specialFeePercentLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return getAllKeys<number>(
                this.cacheService,
                addresses,
                'pair.specialFeePercent',
                this.pairAbi.specialFeePercent.bind(this.pairAbi),
                CacheTtlInfo.ContractState,
            );
        },
    );

    public readonly feesCollectorCutPercentageLoader = new DataLoader<
        string,
        number
    >(async (addresses: string[]) => {
        const percentages = await getAllKeys<number>(
            this.cacheService,
            addresses,
            'pair.feesCollectorCutPercentage',
            this.pairAbi.feesCollectorCutPercentage.bind(this.pairAbi),
            CacheTtlInfo.ContractState,
        );

        return percentages.map(
            (percentage) =>
                percentage / constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS,
        );
    });

    public readonly stateLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return this.pairService.getAllStates(addresses);
        },
    );

    public readonly feeStateLoader = new DataLoader<string, boolean>(
        async (addresses: string[]) => {
            return this.pairService.getAllFeeStates(addresses);
        },
    );

    public readonly initialLiquidityAdderLoader = new DataLoader<
        string,
        string
    >(async (addresses: string[]) => {
        return getAllKeys<string>(
            this.cacheService,
            addresses,
            'pair.initialLiquidityAdder',
            this.pairAbi.initialLiquidityAdder.bind(this.pairAbi),
            CacheTtlInfo.ContractState,
        );
    });
}
