import { Module } from '@nestjs/common';
import { PairMemoryStoreService } from './services/pair.memory.store.service';
import { ConditionalModule } from '@nestjs/config';
import { MemoryStoreCronModule } from './memory.store.cron.module';

@Module({
    imports: [
        ConditionalModule.registerWhen(
            MemoryStoreCronModule,
            (env: NodeJS.ProcessEnv) =>
                env['ENABLE_IN_MEMORY_STORE'] === 'true',
        ),
    ],
    providers: [PairMemoryStoreService],
    exports: [PairMemoryStoreService],
})
export class MemoryStoreModule {}
