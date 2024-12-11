import { Module } from '@nestjs/common';
import { MemoryStoreFactoryService } from './services/memory.store.factory.service';
import { PairMemoryStoreService } from './services/pair.memory.store.service';
import { TokenMemoryStoreService } from './services/token.memory.store.service';

@Module({
    providers: [
        MemoryStoreFactoryService,
        PairMemoryStoreService,
        TokenMemoryStoreService,
    ],
    exports: [
        MemoryStoreFactoryService,
        PairMemoryStoreService,
        TokenMemoryStoreService,
    ],
})
export class MemoryStoreModule {}
