import { HttpModule, Module } from '@nestjs/common';
import { RedisCacheService } from '../redis-cache.service';
import { ServicesModule } from '../services.module';
import { PriceFeedService } from './price-feed.service';

@Module({
    imports: [HttpModule, ServicesModule],
    providers: [PriceFeedService, RedisCacheService],
    exports: [PriceFeedService],
})
export class PriceFeedModule {}
