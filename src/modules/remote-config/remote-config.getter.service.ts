import { Inject, Injectable } from '@nestjs/common';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { SCAddressRepositoryService } from 'src/services/database/repositories/scAddress.repository';
import { FlagRepositoryService } from 'src/services/database/repositories/flag.repository';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { SCAddressType } from './models/sc-address.model';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { AnalyticsRepositoryService } from 'src/services/database/repositories/analytics.repository';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';

@Injectable()
export class RemoteConfigGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        protected readonly scAddressRepositoryService: SCAddressRepositoryService,
        protected readonly flagRepositoryService: FlagRepositoryService,
        protected readonly analyticsRepositoryService: AnalyticsRepositoryService,
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
                        name: 'MAINTENANCE',
                    })
                    .then((res) => {
                        return res.value;
                    }),
            Constants.oneHour(),
        );
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
            Constants.oneHour(),
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
            Constants.oneHour(),
        );
    }

    @GetOrSetCache({
        baseKey: 'scAddress',
        remoteTtl: Constants.oneHour(),
    })
    async getStakingAddresses(): Promise<string[]> {
        return this.scAddressRepositoryService
            .find({
                category: SCAddressType.STAKING,
            })
            .then((res) => {
                return res.map((scAddress) => scAddress.address);
            });
    }

    @GetOrSetCache({
        baseKey: 'scAddress',
        remoteTtl: Constants.oneHour(),
    })
    async getStakingProxyAddresses(): Promise<string[]> {
        return this.scAddressRepositoryService
            .find({
                category: SCAddressType.STAKING_PROXY,
            })
            .then((res) => {
                return res.map((scAddress) => scAddress.address);
            });
    }
}
