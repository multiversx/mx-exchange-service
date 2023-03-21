import { Inject, Injectable } from '@nestjs/common';
import { CachingService } from 'src/services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { SCAddressRepositoryService } from 'src/services/database/repositories/scAddress.repository';
import { FlagRepositoryService } from 'src/services/database/repositories/flag.repository';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { SCAddressType } from './models/sc-address.model';
import { oneHour } from 'src/helpers/helpers';
import { AnalyticsQueryMode } from 'src/services/analytics/entities/analytics.query.mode';
import { AnalyticsRepositoryService } from 'src/services/database/repositories/analytics.repository';

@Injectable()
export class RemoteConfigGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
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
            oneHour(),
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

    async getAnalyticsAWSTimestreamWriteFlagValue(): Promise<boolean> {
        this.baseKey = 'analytics';
        const cacheKey = this.getCacheKey('AWS_TIMESTREAM_WRITE');
        return await this.getData(
            cacheKey,
            () =>
                this.analyticsRepositoryService
                    .findOne({
                        name: 'AWS_TIMESTREAM_WRITE',
                    })
                    .then((res) => {
                        if (!res?.value) {
                            return true; // default value
                        }
                        return res.value === 'true';
                    }),
            oneHour(),
        );
    }

    async getAnalyticsDataApiWriteFlagValue(): Promise<boolean> {
        this.baseKey = 'analytics';
        const cacheKey = this.getCacheKey('DATA_API_WRITE');
        return await this.getData(
            cacheKey,
            () =>
                this.analyticsRepositoryService
                    .findOne({
                        name: 'DATA_API_WRITE',
                    })
                    .then((res) => {
                        if (!res?.value) {
                            return false; // default false
                        }
                        return res.value === 'true';
                    }),
            oneHour(),
        );
    }

    async getAnalyticsQueryMode(): Promise<AnalyticsQueryMode> {
        this.baseKey = 'analytics';
        const cacheKey = this.getCacheKey('QUERY_MODE');
        return await this.getData(
            cacheKey,
            () =>
                this.analyticsRepositoryService
                    .findOne({
                        name: 'QUERY_MODE',
                    })
                    .then((res) => {
                        if (!res?.value) {
                            throw new Error('No analytics.QUERY_MODE present');
                        }

                        const value = res.value as AnalyticsQueryMode;
                        if (
                            value === AnalyticsQueryMode.AWS_TIMESTREAM ||
                            value === AnalyticsQueryMode.DATA_API
                        ) {
                            return value;
                        }

                        throw new Error(
                            'Invalid value for analytics.QUERY_MODE present',
                        );
                    }),
            oneHour(),
        );
    }
}
