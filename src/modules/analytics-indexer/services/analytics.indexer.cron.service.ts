import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Cron, CronExpression } from '@nestjs/schedule';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { AnalyticsIndexerService } from 'src/modules/analytics-indexer/services/analytics.indexer.service';

@Injectable()
export class AnalyticsIndexerCronService {
    constructor(
        private readonly analyticsIndexer: AnalyticsIndexerService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_30_SECONDS)
    @Lock({ name: 'indexAnalytics', verbose: true })
    public async indexAnalytics() {
        try {
            // const [lastProcessedTimestamp, currentTimestamp] =
            //     await this.getProcessingInterval(Constants.oneMinute());
            // if (lastProcessedTimestamp === currentTimestamp) {
            //     return;
            // }

            // liquidity
            const startTimestamp = 1695213000;
            // const endTimestamp = 1695227400;
            const endTimestamp = 1696177800;

            // swaps
            // const startTimestamp = 1695310946;
            // const endTimestamp = 1695390946;

            // price_disco
            // const startTimestamp = 1650900842;
            // const endTimestamp = 1650903182;

            await this.analyticsIndexer.indexAnalytics(
                startTimestamp,
                endTimestamp,
            );
        } catch (error) {
            const logMessage = generateLogMessage(
                AnalyticsIndexerCronService.name,
                this.indexAnalytics.name,
                '',
                error,
            );
            this.logger.error(logMessage);
        }
    }
}
