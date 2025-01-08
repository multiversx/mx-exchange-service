import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CacheController } from '../endpoints/cache/cache.controller';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { ConditionalModule } from '@nestjs/config';
import { MemoryStoreCacheModule } from 'src/modules/memory-store/memory.store.cache.module';

@Module({
    imports: [
        CommonAppModule,
        DynamicModuleUtils.getCacheModule(),
        ConditionalModule.registerWhen(
            MemoryStoreCacheModule,
            (env: NodeJS.ProcessEnv) =>
                env['ENABLE_IN_MEMORY_STORE'] === 'true',
        ),
    ],
    controllers: [CacheController],
    providers: [],
})
export class PubSubModule {}
