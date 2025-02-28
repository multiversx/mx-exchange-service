import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CacheController } from '../endpoints/cache/cache.controller';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { RedisKeyWatcherService } from './redis.key.watcher.service';

@Module({
    imports: [CommonAppModule, DynamicModuleUtils.getCacheModule()],
    controllers: [CacheController],
    providers: [RedisKeyWatcherService],
})
export class PubSubModule {}
