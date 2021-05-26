import { Module } from '@nestjs/common';
import { PriceFeedService } from './price-feed.service';

@Module({
    providers: [PriceFeedService],
    exports: [PriceFeedService],
})
export class PriceFeedModule {}
