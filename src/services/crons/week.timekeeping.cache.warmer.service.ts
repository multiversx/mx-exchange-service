import { Inject, Injectable } from '@nestjs/common';
import { PUB_SUB } from '../redis.pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { WeekTimekeepingSetterService } from 'src/submodules/week-timekeeping/services/week-timekeeping.setter.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { scAddress } from 'src/config';
import { farmsAddresses } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';

@Injectable()
export class WeekTimekeepingCacheWarmerService {
    constructor(
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        private readonly weekTimekeepingSetter: WeekTimekeepingSetterService,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    @Lock({ name: 'cacheWeekTimekeepingData', verbose: true })
    async cacheWeekTimekeepingData(): Promise<void> {
        this.logger.info(
            'Start refresh week timekeeping data for farms, staking and fees collector',
            {
                context: 'WeekTimekeepingCacheWarmer',
            },
        );

        const addresses = [
            scAddress.feesCollector,
            ...farmsAddresses([FarmVersion.V2]),
            ...(await this.remoteConfigGetterService.getStakingAddresses()),
        ];

        const profiler = new PerformanceProfiler();

        for (const address of addresses) {
            const [currentWeek, firstWeekStartEpoch] = await Promise.all([
                this.weekTimekeepingAbi.getCurrentWeekRaw(address),
                this.weekTimekeepingAbi.firstWeekStartEpochRaw(address),
            ]);

            const abiCacheKeys = await Promise.all([
                this.weekTimekeepingSetter.currentWeek(address, currentWeek),
                this.weekTimekeepingSetter.firstWeekStartEpoch(
                    address,
                    firstWeekStartEpoch,
                ),
            ]);

            const [startEpochForWeek, endEpochForWeek] = await Promise.all([
                this.weekTimekeepingCompute.computeStartEpochForWeek(
                    address,
                    currentWeek,
                ),
                this.weekTimekeepingCompute.computeEndEpochForWeek(
                    address,
                    currentWeek,
                ),
            ]);

            const computeCacheKeys = await Promise.all([
                this.weekTimekeepingSetter.startEpochForWeek(
                    address,
                    currentWeek,
                    startEpochForWeek,
                ),
                this.weekTimekeepingSetter.endEpochForWeek(
                    address,
                    currentWeek,
                    endEpochForWeek,
                ),
            ]);

            await this.deleteCacheKeys([...abiCacheKeys, ...computeCacheKeys]);
        }

        profiler.stop();
        this.logger.info(
            `Finish refresh week timekeeping data in ${profiler.duration}`,
            {
                context: 'WeekTimekeepingCacheWarmer',
            },
        );
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
