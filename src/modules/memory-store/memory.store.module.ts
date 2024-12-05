import { Module } from '@nestjs/common';
import { PairMemoryStoreService } from './services/pair.memory.store.service';
import { ConditionalModule } from '@nestjs/config';
import { MemoryStoreCronModule } from './memory.store.cron.module';
import { MemoryStoreFactoryService } from './services/memory.store.factory.service';

@Module({
    imports: [
        ConditionalModule.registerWhen(
            MemoryStoreCronModule,
            (env: NodeJS.ProcessEnv) =>
                env['ENABLE_IN_MEMORY_STORE'] === 'true',
        ),
    ],
    providers: [PairMemoryStoreService, MemoryStoreFactoryService],
    exports: [PairMemoryStoreService, MemoryStoreFactoryService],
})
export class MemoryStoreModule {}
