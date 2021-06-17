import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PairService } from '../../modules/pair/pair.service';
import { PriceFeedService } from '../price-feed/price-feed.service';
import { tokensPriceData } from '../../config';
import { RedlockService } from '../redlock';
import { ContextService } from '../context/context.service';

@Injectable()
export class CacheWarmerService {
    constructor(
        private readonly priceFeed: PriceFeedService,
        private readonly pairService: PairService,
        private readonly redlockService: RedlockService,
        private readonly context: ContextService,
    ) {}

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cachePairsInfo(): Promise<void> {
        const pairsAddress = await this.context.getAllPairsAddress();
        const promises = pairsAddress.map(async pairAddress => {
            const resource = `${pairAddress}.pairInfo`;
            const lockExpire = 20;
            let lock;

            try {
                lock = await this.redlockService.lockTryOnce(
                    resource,
                    lockExpire,
                );
            } catch (e) {
                return;
            }
            if (lock === 0) {
                return;
            }

            return this.pairService.getPairInfoMetadata(pairAddress);
        });
        await Promise.all(promises);
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cachePriceFeeds(): Promise<void> {
        for (const priceFeed in tokensPriceData) {
            const resource = `priceFeed.${priceFeed}`;
            const lockExpire = 5;
            let lock;

            try {
                lock = await this.redlockService.lockTryOnce(
                    resource,
                    lockExpire,
                );
            } catch (e) {
                return;
            }
            if (lock === 0) {
                return;
            }
            await this.priceFeed.getTokenPrice(tokensPriceData.get(priceFeed));
        }
    }
}
