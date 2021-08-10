import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CacheController } from '../endpoints/cache/cache.controller';
import { CachingModule } from './caching/cache.module';

@Module({
    imports: [CommonAppModule, CachingModule],
    controllers: [CacheController],
    providers: [],
})
export class PubSubModule {}
