import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CachingModule } from '../caching/cache.module';
import { ServicesModule } from '../services.module';
import { PriceFeedService } from './price-feed.service';

@Module({
    imports: [ServicesModule, CachingModule, HttpModule],
    providers: [PriceFeedService],
    exports: [PriceFeedService],
})
export class PriceFeedModule {}
