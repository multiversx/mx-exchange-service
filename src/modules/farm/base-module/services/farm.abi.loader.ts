import { Injectable, Scope } from '@nestjs/common';
import { FarmServiceBase } from './farm.base.service';
import DataLoader from 'dataloader';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { FarmAbiService } from './farm.abi.service';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmAbiLoader {
    constructor(
        protected readonly farmAbi: FarmAbiService,
        protected readonly farmService: FarmServiceBase,
    ) {}

    public readonly farmedTokenLoader = new DataLoader<string, EsdtToken>(
        async (addresses: string[]) => {
            return await this.farmService.getAllFarmedTokens(addresses);
        },
    );

    public readonly farmTokenLoader = new DataLoader<string, NftCollection>(
        async (addresses: string[]) => {
            return await this.farmService.getAllFarmTokens(addresses);
        },
    );

    public readonly farmingTokenLoader = new DataLoader<string, EsdtToken>(
        async (addresses: string[]) => {
            return await this.farmService.getAllFarmingTokens(addresses);
        },
    );

    public readonly produceRewardsEnabledLoader = new DataLoader<
        string,
        boolean
    >(async (addresses: string[]) => {
        return await this.farmAbi.getAllKeys<boolean>(
            addresses,
            'farm.produceRewardsEnabled',
            this.farmAbi.produceRewardsEnabled.bind(this.farmAbi),
        );
    });

    public readonly perBlockRewardsLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await this.farmAbi.getAllKeys<string>(
                addresses,
                'farm.perBlockRewards',
                this.farmAbi.rewardsPerBlock.bind(this.farmAbi),
            );
        },
    );

    public readonly farmTokenSupplyLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await this.farmAbi.getAllKeys<string>(
                addresses,
                'farm.farmTokenSupply',
                this.farmAbi.farmTokenSupply.bind(this.farmAbi),
            );
        },
    );

    public readonly penaltyPercentLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return await this.farmAbi.getAllKeys<number>(
                addresses,
                'farm.penaltyPercent',
                this.farmAbi.penaltyPercent.bind(this.farmAbi),
            );
        },
    );

    public readonly minimumFarmingEpochsLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return await this.farmAbi.getAllKeys<number>(
                addresses,
                'farm.minimumFarmingEpochs',
                this.farmAbi.minimumFarmingEpochs.bind(this.farmAbi),
            );
        },
    );

    public readonly rewardPerShareLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await this.farmAbi.getAllKeys<string>(
                addresses,
                'farm.rewardPerShare',
                this.farmAbi.rewardPerShare.bind(this.farmAbi),
            );
        },
    );

    public readonly rewardReserveLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await this.farmAbi.getAllKeys<string>(
                addresses,
                'farm.rewardReserve',
                this.farmAbi.rewardReserve.bind(this.farmAbi),
            );
        },
    );

    public readonly lastRewardBlockNonceLoader = new DataLoader<string, number>(
        async (addresses: string[]) => {
            return await this.farmAbi.getAllKeys<number>(
                addresses,
                'farm.lastRewardBlockNonce',
                this.farmAbi.lastRewardBlockNonce.bind(this.farmAbi),
            );
        },
    );

    public readonly divisionSafetyConstantLoader = new DataLoader<
        string,
        string
    >(async (addresses: string[]) => {
        return await this.farmAbi.getAllKeys<string>(
            addresses,
            'farm.divisionSafetyConstant',
            this.farmAbi.divisionSafetyConstant.bind(this.farmAbi),
        );
    });

    public readonly stateLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await this.farmAbi.getAllKeys<string>(
                addresses,
                'farm.state',
                this.farmAbi.state.bind(this.farmAbi),
            );
        },
    );
}
