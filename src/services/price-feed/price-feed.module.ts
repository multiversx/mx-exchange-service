import { Module } from '@nestjs/common';
import { CacheManagerModule } from '../cache-manager/cache-manager.module';
import { ServicesModule } from '../services.module';
import { PriceFeedService } from './price-feed.service';

@Module({
    imports: [ServicesModule, CacheManagerModule],
    providers: [PriceFeedService],
    exports: [PriceFeedService],
})
export class PriceFeedModule {}
