import { HttpModule, Module } from '@nestjs/common';
import { CachingModule } from '../caching/cache.module';
import { ServicesModule } from '../services.module';
import { PriceFeedService } from './price-feed.service';

@Module({
    imports: [HttpModule, ServicesModule, CachingModule],
    providers: [PriceFeedService],
    exports: [PriceFeedService],
})
export class PriceFeedModule {}
