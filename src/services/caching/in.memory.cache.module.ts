import { Module } from '@nestjs/common';
import { InMemoryCacheService } from './in.memory.cache.service';

@Module({
    providers: [InMemoryCacheService],
    exports: [InMemoryCacheService],
})
export class InMemoryCacheModule {}
