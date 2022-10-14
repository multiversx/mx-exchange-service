import { Inject, Injectable } from '@nestjs/common';
import { CachingService } from 'src/services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { SCAddressRepositoryService } from 'src/services/database/repositories/scAddress.repository';
import { FlagRepositoryService } from 'src/services/database/repositories/flag.repository';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { SCAddressType } from './models/sc-address.model';
import { oneHour } from 'src/helpers/helpers';

@Injectable()
export class RemoteConfigGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly scAddressRepositoryService: SCAddressRepositoryService,
        protected readonly flagRepositoryService: FlagRepositoryService,
    ) {
        super(cachingService, logger);
    }

    async getMaintenanceFlagValue(): Promise<boolean> {
        this.baseKey = 'flag';
        const cacheKey = this.getCacheKey('MAINTENANCE');
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
        this.baseKey = 'flag';
        const cacheKey = this.getCacheKey('MULTISWAP');
        return await this.getData(
            cacheKey,
            () =>
                this.flagRepositoryService
                    .findOne({
                        name: 'MULTISWAP',
                    })
                    .then((res) => {
                        return res ? res.value : false;
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
                    .then((res) => {
                        return res.map((scAddress) => scAddress.address);
                    }),
            oneHour(),
        );
    }

    async getStakingAddresses(): Promise<string[]> {
        this.baseKey = 'scAddress';
        const cacheKey = this.getCacheKey(SCAddressType.STAKING);
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
        this.baseKey = 'scAddress';
        const cacheKey = this.getCacheKey(SCAddressType.STAKING_PROXY);
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
}
