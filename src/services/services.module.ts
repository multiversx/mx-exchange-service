import { Module } from '@nestjs/common';
import { CachingModule } from './caching/cache.module';
import { RedlockService } from './redlock';

@Module({
    imports: [CachingModule],
    providers: [RedlockService],
    exports: [RedlockService],
})
export class ServicesModule {}
