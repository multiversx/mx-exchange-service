import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CacheController } from '../endpoints/cache/cache.controller';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { ConditionalModule } from '@nestjs/config';
import { MemoryStorePubSubModule } from 'src/modules/memory-store/memory.store.pubsub.module';

@Module({
    imports: [
        CommonAppModule,
        DynamicModuleUtils.getCacheModule(),
        ConditionalModule.registerWhen(
            MemoryStorePubSubModule,
            (env: NodeJS.ProcessEnv) =>
                env['ENABLE_IN_MEMORY_STORE'] === 'true',
        ),
    ],
    controllers: [CacheController],
    providers: [],
})
export class PubSubModule {}
