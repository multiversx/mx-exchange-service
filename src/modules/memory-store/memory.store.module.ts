import { Module } from '@nestjs/common';
import { MemoryStoreFactoryService } from './services/memory.store.factory.service';
import { PairMemoryStoreService } from './services/pair.memory.store.service';

@Module({
    providers: [MemoryStoreFactoryService, PairMemoryStoreService],
    exports: [MemoryStoreFactoryService, PairMemoryStoreService],
})
export class MemoryStoreModule {}
