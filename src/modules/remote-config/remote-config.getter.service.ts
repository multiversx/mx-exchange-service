import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { FlagRepositoryService } from 'src/services/database/repositories/flag.repository';
import { SCAddressRepositoryService } from 'src/services/database/repositories/scAddress.repository';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { FlagType } from './models/flag.model';
import { SCAddressType } from './models/sc-address.model';

@Injectable()
export class RemoteConfigGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly flagRepositoryService: FlagRepositoryService,
        private readonly scAddressRepositoryService: SCAddressRepositoryService,
    ) {
        super(cachingService, logger);
    }

    private async getGenericFlag(
        name: FlagType,
        ttl: number,
    ): Promise<boolean> {
        const cacheKey = this.getFlagCacheKey(name);
        return await this.getData(
            cacheKey,
            () =>
                this.flagRepositoryService
                    .findOne({
                        name: name,
                    })
                    .then((res) => {
                        return res.value;
                    }),
            ttl,
        );
    }

    async getMaintenanceFlagValue(): Promise<boolean> {
        return await this.getGenericFlag(FlagType.MAINTENANCE, oneHour());
    }

    async getTimescaleWriteFlag(): Promise<boolean> {
        return await this.getGenericFlag(FlagType.TIMESCALE_WRITE, oneHour());
    }

    async getTimescaleReadFlag(): Promise<boolean> {
        return await this.getGenericFlag(FlagType.TIMESCALE_READ, oneHour());
    }

    async getTimestreamWriteFlagValue(): Promise<boolean> {
        return await this.getGenericFlag(FlagType.TIMESTREAM_WRITE, oneHour());
    }

    async getMultiSwapStatus(): Promise<boolean> {
        return await this.getGenericFlag(FlagType.MULTISWAP, oneHour());
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
                    .then((res) => {
                        return res.map((scAddress) => scAddress.address);
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
                    .then((res) => {
                        return res.map((scAddress) => scAddress.address);
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
                    .then((res) => {
                        return res.map((scAddress) => scAddress.address);
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
