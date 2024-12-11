import { Module } from '@nestjs/common';
import { MemoryStoreFactoryService } from './services/memory.store.factory.service';

@Module({
    providers: [MemoryStoreFactoryService],
    exports: [MemoryStoreFactoryService],
})
export class MemoryStoreModule {}
