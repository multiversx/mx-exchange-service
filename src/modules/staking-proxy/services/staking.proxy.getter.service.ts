import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { CachingService } from 'src/services/caching/cache.service';

import { Logger } from 'winston';
import { AbiStakingProxyService } from './staking.proxy.abi.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';

@Injectable()
export class StakingProxyGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: AbiStakingProxyService,
        private readonly tokenGetter: TokenGetterService,
    ) {
        super(cachingService, logger);
    }

    async getLpFarmAddress(stakingProxyAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'lpFarmAddress'),
            () => this.abiService.getLpFarmAddress(stakingProxyAddress),
            oneHour(),
        );
    }

    async getStakingFarmAddress(stakingProxyAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeProxyCacheKey(
                stakingProxyAddress,
                'stakingFarmAddress',
            ),
            () => this.abiService.getStakingFarmAddress(stakingProxyAddress),
            oneHour(),
        );
    }

    async getPairAddress(stakingProxyAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'pairAddress'),
            () => this.abiService.getPairAddress(stakingProxyAddress),
            oneHour(),
        );
    }

    async getStakingTokenID(stakingProxyAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'stakingTokenID'),
            () => this.abiService.getStakingTokenID(stakingProxyAddress),
            oneHour(),
        );
    }

    async getFarmTokenID(stakingProxyAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'farmTokenID'),
            () => this.abiService.getFarmTokenID(stakingProxyAddress),
            oneHour(),
        );
    }

    async getDualYieldTokenID(stakingProxyAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'dualYieldTokenID'),
            () => this.abiService.getDualYieldTokenID(stakingProxyAddress),
            oneHour(),
        );
    }

    async getLpFarmTokenID(stakingProxyAddress: string): Promise<string> {
        return await this.getData(
            this.getStakeProxyCacheKey(stakingProxyAddress, 'lpFarmTokenID'),
            () => this.abiService.getLpFarmTokenID(stakingProxyAddress),
            oneHour(),
        );
    }

    async getStakingToken(stakingProxyAddress: string): Promise<EsdtToken> {
        const stakingTokenID = await this.getStakingTokenID(
            stakingProxyAddress,
        );
        return await this.tokenGetter.getTokenMetadata(stakingTokenID);
    }

    async getFarmToken(stakingProxyAddress: string): Promise<NftCollection> {
        const farmTokenID = await this.getFarmTokenID(stakingProxyAddress);
        return await this.tokenGetter.getNftCollectionMetadata(farmTokenID);
    }

    async getDualYieldToken(
        stakingProxyAddress: string,
    ): Promise<NftCollection> {
        const dualYieldTokenID = await this.getDualYieldTokenID(
            stakingProxyAddress,
        );
        return await this.tokenGetter.getNftCollectionMetadata(
            dualYieldTokenID,
        );
    }

    async getLpFarmToken(stakingProxyAddress: string): Promise<NftCollection> {
        const lpFarmTokenID = await this.getLpFarmTokenID(stakingProxyAddress);
        return await this.tokenGetter.getNftCollectionMetadata(lpFarmTokenID);
    }

    private getStakeProxyCacheKey(stakingProxyAddress: string, ...args: any) {
        return this.getCacheKey('stakeProxy', stakingProxyAddress, ...args);
    }
}
