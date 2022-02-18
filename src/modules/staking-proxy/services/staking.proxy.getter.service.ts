import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { cacheConfig } from 'src/config';
import { oneSecond } from 'src/helpers/helpers';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { StakingGetterService } from 'src/modules/staking/services/staking.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { AbiStakingProxyService } from './staking.proxy.abi.service';

@Injectable()
export class StakingProxyGetterService {
    constructor(
        private readonly abiService: AbiStakingProxyService,
        private readonly contextGetterService: ContextGetterService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        stakingProxyAddress: string,
        cacheKeyArg: string,
        createValueFunc: () => any,
        ttl: number = cacheConfig.default,
    ): Promise<any> {
        const cacheKey = this.getStakeProxyCacheKey(
            stakingProxyAddress,
            cacheKeyArg,
        );
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                StakingGetterService.name,
                createValueFunc.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getLpFarmAddress(stakingProxyAddress: string): Promise<string> {
        return await this.getData(
            stakingProxyAddress,
            'lpFarmAddress',
            () => this.abiService.getLpFarmAddress(stakingProxyAddress),
            oneSecond(),
        );
    }

    async getStakingFarmAddress(stakingProxyAddress: string): Promise<string> {
        return await this.getData(
            stakingProxyAddress,
            'stakingFarmAddress',
            () => this.abiService.getStakingFarmAddress(stakingProxyAddress),
            oneSecond(),
        );
    }

    async getPairAddress(stakingProxyAddress: string): Promise<string> {
        return await this.getData(
            stakingProxyAddress,
            'pairAddress',
            () => this.abiService.getPairAddress(stakingProxyAddress),
            oneSecond(),
        );
    }

    async getStakingTokenID(stakingProxyAddress: string): Promise<string> {
        return await this.getData(
            stakingProxyAddress,
            'stakingTokenID',
            () => this.abiService.getStakingTokenID(stakingProxyAddress),
            oneSecond(),
        );
    }

    async getFarmTokenID(stakingProxyAddress: string): Promise<string> {
        return await this.getData(
            stakingProxyAddress,
            'farmTokenID',
            () => this.abiService.getFarmTokenID(stakingProxyAddress),
            oneSecond(),
        );
    }

    async getDualYieldTokenID(stakingProxyAddress: string): Promise<string> {
        return await this.getData(
            stakingProxyAddress,
            'dualYieldTokenID',
            () => this.abiService.getDualYieldTokenID(stakingProxyAddress),
            oneSecond(),
        );
    }

    async getLpFarmTokenID(stakingProxyAddress: string): Promise<string> {
        return await this.getData(
            stakingProxyAddress,
            'lpFarmTokenID',
            () => this.abiService.getLpFarmTokenID(stakingProxyAddress),
            oneSecond(),
        );
    }

    async getStakingToken(stakingProxyAddress: string): Promise<EsdtToken> {
        const stakingTokenID = await this.getStakingTokenID(
            stakingProxyAddress,
        );
        return await this.contextGetterService.getTokenMetadata(stakingTokenID);
    }

    async getFarmToken(stakingProxyAddress: string): Promise<NftCollection> {
        const farmTokenID = await this.getFarmTokenID(stakingProxyAddress);
        return await this.contextGetterService.getNftCollectionMetadata(
            farmTokenID,
        );
    }

    async getDualYieldToken(
        stakingProxyAddress: string,
    ): Promise<NftCollection> {
        const dualYieldTokenID = await this.getDualYieldTokenID(
            stakingProxyAddress,
        );
        return await this.contextGetterService.getNftCollectionMetadata(
            dualYieldTokenID,
        );
    }

    async getLpFarmToken(stakingProxyAddress: string): Promise<NftCollection> {
        const lpFarmTokenID = await this.getLpFarmTokenID(stakingProxyAddress);
        return await this.contextGetterService.getNftCollectionMetadata(
            lpFarmTokenID,
        );
    }

    private getStakeProxyCacheKey(stakingProxyAddress: string, ...args: any) {
        return generateCacheKeyFromParams(
            'stakeProxy',
            stakingProxyAddress,
            ...args,
        );
    }
}
