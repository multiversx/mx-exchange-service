import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';
import { UnstakePairModel } from '../models/token.unstake.model';
import { TokenUnstakeAbiService } from './token.unstake.abi.service';

@Injectable()
export class TokenUnstakeGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: TokenUnstakeAbiService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'tokenUnstake';
    }

    async getUnbondEpochs(): Promise<number> {
        return await this.getData(
            this.getCacheKey('unbondEpochs'),
            () => this.abiService.getUnbondEpochs(),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getFeesBurnPercentage(): Promise<number> {
        return await this.getData(
            this.getCacheKey('feesBurnPercentage'),
            () => this.abiService.getFeesBurnPercentage(),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getFeesCollectorAddress(): Promise<string> {
        return await this.getData(
            this.getCacheKey('feesCollectorAddress'),
            () => this.abiService.getFeesCollectorAddress(),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getLastEpochFeeSentToCollector(): Promise<number> {
        return await this.getData(
            this.getCacheKey('lastEpochFeeSentToCollector'),
            () => this.abiService.getLastEpochFeeSentToCollector(),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getEnergyFactoryAddress(): Promise<string> {
        return await this.getData(
            this.getCacheKey('energyFactoryAddress'),
            () => this.abiService.getEnergyFactoryAddress(),
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async getUnlockedTokensForUser(
        userAddress: string,
    ): Promise<UnstakePairModel[]> {
        return await this.getData(
            this.getCacheKey(userAddress, 'unlockedTokens'),
            () => this.abiService.getUnlockedTokensForUser(userAddress),
            CacheTtlInfo.ContractBalance.remoteTtl,
            CacheTtlInfo.ContractBalance.localTtl,
        );
    }
}
