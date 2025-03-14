import { Injectable, Scope } from '@nestjs/common';
import { FarmServiceBase } from './farm.base.service';
import DataLoader from 'dataloader';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { FarmAbiService } from './farm.abi.service';
import { CacheService } from 'src/services/caching/cache.service';
import { getAllKeys } from 'src/utils/get.many.utils';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmAbiLoader {
    constructor(
        protected readonly farmAbi: FarmAbiService,
        protected readonly farmService: FarmServiceBase,
        protected readonly cacheService: CacheService,
    ) {}

    public readonly farmedTokenLoader = new DataLoader<string, EsdtToken>(
        async (addresses: string[]) => {
            return this.farmService.getAllFarmedTokens(addresses);
        },
    );

    public readonly farmTokenLoader = new DataLoader<string, NftCollection>(
        async (addresses: string[]) => {
            return this.farmService.getAllFarmTokens(addresses);
        },
    );

    public readonly farmingTokenLoader = new DataLoader<string, EsdtToken>(
        async (addresses: string[]) => {
            return this.farmService.getAllFarmingTokens(addresses);
        },
    );

    public readonly produceRewardsEnabledLoader = new DataLoader<
        string,
        boolean
    >(async (addresses: string[]) => {
        return getAllKeys<boolean>(
            this.cacheService,
            addresses,
            'farm.produceRewardsEnabled',
            this.farmAbi.produceRewardsEnabled.bind(this.farmAbi),
            CacheTtlInfo.ContractState,
        );
    });

    public readonly perBlockRewardsLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return getAllKeys<string>(
                this.cacheService,
                addresses,
                'farm.perBlockRewards',
                this.farmAbi.rewardsPerBlock.bind(this.farmAbi),
                CacheTtlInfo.ContractState,
            );
        },
    );

    public readonly farmTokenSupplyLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return getAllKeys<string>(
                this.cacheService,
                addresses,
                'farm.farmTokenSupply',
                this.farmAbi.farmTokenSupply.bind(this.farmAbi),
                CacheTtlInfo.ContractInfo,
            );
        },
    );

    public readonly penaltyPercentLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return getAllKeys<number>(
                this.cacheService,
                addresses,
                'farm.penaltyPercent',
                this.farmAbi.penaltyPercent.bind(this.farmAbi),
                CacheTtlInfo.ContractState,
            );
        },
    );

    public readonly minimumFarmingEpochsLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return getAllKeys<number>(
                this.cacheService,
                addresses,
                'farm.minimumFarmingEpochs',
                this.farmAbi.minimumFarmingEpochs.bind(this.farmAbi),
                CacheTtlInfo.ContractState,
            );
        },
    );

    public readonly rewardPerShareLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return getAllKeys<string>(
                this.cacheService,
                addresses,
                'farm.rewardPerShare',
                this.farmAbi.rewardPerShare.bind(this.farmAbi),
                CacheTtlInfo.ContractInfo,
            );
        },
    );

    public readonly rewardReserveLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return getAllKeys<string>(
                this.cacheService,
                addresses,
                'farm.rewardReserve',
                this.farmAbi.rewardReserve.bind(this.farmAbi),
                CacheTtlInfo.ContractInfo,
            );
        },
    );

    public readonly lastRewardBlockNonceLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return getAllKeys<number>(
                this.cacheService,
                addresses,
                'farm.lastRewardBlockNonce',
                this.farmAbi.lastRewardBlockNonce.bind(this.farmAbi),
                CacheTtlInfo.ContractInfo,
            );
        },
    );

    public readonly divisionSafetyConstantLoader = new DataLoader<
        string,
        string
    >(async (addresses: string[]) => {
        return getAllKeys<string>(
            this.cacheService,
            addresses,
            'farm.divisionSafetyConstant',
            this.farmAbi.divisionSafetyConstant.bind(this.farmAbi),
            CacheTtlInfo.ContractInfo,
        );
    });

    public readonly stateLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return getAllKeys<string>(
                this.cacheService,
                addresses,
                'farm.state',
                this.farmAbi.state.bind(this.farmAbi),
                CacheTtlInfo.ContractState,
            );
        },
    );
}
