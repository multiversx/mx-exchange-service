import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { FlagRepositoryService } from 'src/services/database/repositories/flag.repository';
import { SCAddressRepositoryService } from 'src/services/database/repositories/scAddress.repository';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { SCAddressType } from './models/sc-address.model';

@Injectable()
export class RemoteConfigGetterService {
    constructor(
        private readonly cachingService: CachingService,
        private readonly flagRepositoryService: FlagRepositoryService,
        private readonly scAddressRepositoryService: SCAddressRepositoryService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        cacheKey: string,
        createValueFunc: () => any,
        ttl: number,
    ): Promise<any> {
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                RemoteConfigGetterService.name,
                createValueFunc.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getMaintenanceFlagValue(): Promise<boolean> {
        const cacheKey = this.getFlagCacheKey('MAINTENANCE');
        return await this.getData(
            cacheKey,
            () =>
                this.flagRepositoryService
                    .findOne({
                        name: 'MAINTENANCE',
                    })
                    .then(res => {
                        return res.value;
                    }),
            oneHour(),
        );
    }

    async getSCAddresses(
        cacheKey: string,
        category: SCAddressType,
    ): Promise<string[]> {
        return await this.getData(
            cacheKey,
            () =>
                this.scAddressRepositoryService
                    .find({
                        category: category,
                    })
                    .then(res => {
                        return res.map(scAddress => scAddress.address);
                    }),
            oneHour(),
        );
    }

    async getStakingAddresses(): Promise<string[]> {
        const cacheKey = this.getSCAddressCacheKey(SCAddressType.STAKING);
        return await this.getData(
            cacheKey,
            () =>
                this.scAddressRepositoryService
                    .find({
                        category: SCAddressType.STAKING,
                    })
                    .then(res => {
                        return res.map(scAddress => scAddress.address);
                    }),
            oneHour(),
        );
    }

    async getStakingProxyAddresses(): Promise<string[]> {
        const cacheKey = this.getSCAddressCacheKey(SCAddressType.STAKING_PROXY);
        return await this.getData(
            cacheKey,
            () =>
                this.scAddressRepositoryService
                    .find({
                        category: SCAddressType.STAKING_PROXY,
                    })
                    .then(res => {
                        return res.map(scAddress => scAddress.address);
                    }),
            oneHour(),
        );
    }

    private getFlagCacheKey(flagName: string, ...args: any) {
        return generateCacheKeyFromParams('flag', flagName, ...args);
    }

    private getSCAddressCacheKey(category: SCAddressType, ...args: any) {
        return generateCacheKeyFromParams('scAddress', category, ...args);
    }
}
