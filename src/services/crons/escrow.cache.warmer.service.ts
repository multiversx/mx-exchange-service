import { Inject, Injectable } from '@nestjs/common';
import { PUB_SUB } from '../redis.pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { EscrowAbiService } from 'src/modules/escrow/services/escrow.abi.service';
import { EscrowSetterService } from 'src/modules/escrow/services/escrow.setter.service';

@Injectable()
export class EscrowCacheWarmerService {
    constructor(
        private readonly escrowAbiService: EscrowAbiService,
        private readonly escrowSetterService: EscrowSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    @Lock({ name: 'cacheEscrowScStorageKeys', verbose: true })
    async cacheScStorageKeys(): Promise<void> {
        this.logger.info('Start refresh cached escrow SC storage keys', {
            context: 'CacheEscrow',
        });

        const profiler = new PerformanceProfiler();
        const hexValues = await this.escrowAbiService.scKeysRaw();
        const cachedKey = await this.escrowSetterService.setSCStorageKeys(
            hexValues,
        );

        await this.deleteCacheKeys([cachedKey]);

        profiler.stop();
        this.logger.info(
            `Finish refresh escrow SC storage keys in ${profiler.duration}`,
        );
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
