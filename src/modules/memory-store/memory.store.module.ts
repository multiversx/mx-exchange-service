import { Module } from '@nestjs/common';
import { MemoryStoreFactoryService } from './services/memory.store.factory.service';
import { ConditionalModule } from '@nestjs/config';
import { MemoryStoreCronModule } from './memory.store.cron.module';
import { PairMemoryStoreService } from './services/pair.memory.store.service';

@Module({
    imports: [
        ConditionalModule.registerWhen(
            MemoryStoreCronModule,
            (env: NodeJS.ProcessEnv) =>
                env['ENABLE_IN_MEMORY_STORE'] === 'true',
        ),
    ],
    providers: [MemoryStoreFactoryService, PairMemoryStoreService],
    exports: [MemoryStoreFactoryService, PairMemoryStoreService],
})
export class MemoryStoreModule {}
