import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Inject, Injectable } from '@nestjs/common';
import { scAddress } from 'src/config';
import { StateService } from './state.service';
import { ElasticSearchEventsService } from 'src/services/elastic-search/services/es.events.service';
import { convertEventTopicsAndDataToBase64 } from 'src/utils/elastic.search.utils';
import { SWAP_IDENTIFIER } from 'src/modules/rabbitmq/handlers/pair.swap.handler.service';
import { AnalyticsWriteService } from 'src/services/analytics/services/analytics.write.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import BigNumber from 'bignumber.js';
import { RawElasticEventType } from 'src/services/elastic-search/entities/raw.elastic.event';
import {
    AddLiquidityEvent,
    DepositEvent,
    RemoveLiquidityEvent,
    SwapEvent,
    WithdrawEvent,
} from '@multiversx/sdk-exchange';
import { IndexerSwapHandlerService } from './event-handlers/swap.handler.service';
import { IndexerLiquidityHandlerService } from './event-handlers/liquidity.handler.service';
import { IndexerPriceDiscoveryHandlerService } from './event-handlers/price.discovery.handler.service';
import moment from 'moment';

@Injectable()
export class AnalyticsIndexerService {
    private filterAddresses: string[];
    private data: any[];

    constructor(
        private readonly stateService: StateService,
        private readonly elasticEventsService: ElasticSearchEventsService,
        private readonly analyticsWrite: AnalyticsWriteService,
        private readonly swapHandlerService: IndexerSwapHandlerService,
        private readonly liquidityHandlerService: IndexerLiquidityHandlerService,
        private readonly priceDiscoveryHandlerService: IndexerPriceDiscoveryHandlerService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    public async indexAnalytics(
        startTimestamp: number,
        endTimestamp?: number,
    ): Promise<void> {
        const performanceProfiler = new PerformanceProfiler();

        const startDateUtc = moment
            .unix(startTimestamp)
            .format('YYYY-MM-DD HH:mm:ss');
        const endDateUtc = endTimestamp
            ? moment.unix(endTimestamp).format('YYYY-MM-DD HH:mm:ss')
            : moment().format('YYYY-MM-DD HH:mm:ss');

        this.logger.info(
            `Start indexing analytics data between '${startDateUtc}' and '${endDateUtc}'`,
            {
                context: 'AnalyticsIndexerService',
            },
        );

        await this.stateService.initState(startTimestamp);

        this.initFilterAddresses();

        await this.fetchEvents(startTimestamp, endTimestamp);

        performanceProfiler.stop();

        this.logger.info(
            `Finished indexing analytics data between '${startDateUtc}' and '${endDateUtc}' in ${performanceProfiler.duration}ms`,
            {
                context: 'AnalyticsIndexerService',
            },
        );
    }

    private initFilterAddresses(): void {
        this.filterAddresses = [];
        const pairs = this.stateService.getPairsMetadata();

        this.filterAddresses.push(...pairs.map((pair) => pair.address));
        this.filterAddresses.push(...scAddress.priceDiscovery);
    }

    private async fetchEvents(
        startTimestamp: number,
        endTimestamp: number,
    ): Promise<void> {
        const eventsByTimestamp: Map<number, RawElasticEventType[]> = new Map();

        const processEventsAction = async (events: any[]): Promise<void> => {
            for (const event of events) {
                try {
                    const rawEvent = convertEventTopicsAndDataToBase64(event);
                    if (rawEvent.data === '') {
                        continue;
                    }

                    if (eventsByTimestamp.has(rawEvent.timestamp)) {
                        const rawEvents = eventsByTimestamp.get(
                            rawEvent.timestamp,
                        );
                        rawEvents.push(rawEvent);
                        eventsByTimestamp.set(rawEvent.timestamp, rawEvents);
                    } else {
                        eventsByTimestamp.set(rawEvent.timestamp, [rawEvent]);
                    }
                } catch (error) {
                    if (
                        error?.message?.includes('Cannot create address from')
                    ) {
                        console.log('Invalid event', event);
                    } else {
                        console.log(`Could not process event:`, event);
                        console.log(error);
                    }
                    continue;
                }
            }

            // skip processing for a single timestamp
            if (eventsByTimestamp.size <= 1) {
                return;
            }

            const timestampsCount = eventsByTimestamp.size;
            const eventTimestamps = eventsByTimestamp.keys();

            for (let i = 0; i < timestampsCount - 1; i++) {
                const timestamp = eventTimestamps.next().value;
                const rawEvents = eventsByTimestamp.get(timestamp);

                await this.processEvents(rawEvents);

                eventsByTimestamp.delete(timestamp);
            }
        };

        await this.elasticEventsService.getEventsForAddresses(
            this.filterAddresses,
            [
                SWAP_IDENTIFIER.SWAP_FIXED_INPUT,
                SWAP_IDENTIFIER.SWAP_FIXED_OUTPUT,
                'addLiquidity',
                'removeLiquidity',
                'deposit',
                'withdraw',
            ],
            startTimestamp,
            endTimestamp,
            processEventsAction,
            1000,
        );

        // process remaining batch of events
        if (eventsByTimestamp.size > 0) {
            for (const rawEvents of eventsByTimestamp.values()) {
                await this.processEvents(rawEvents);
            }
        }
    }

    private async processEvents(
        rawEvents: RawElasticEventType[] | undefined,
    ): Promise<void> {
        if (!rawEvents || rawEvents.length === 0) {
            return;
        }

        this.data = [];
        let timestamp: number;

        let eventData: any[] = [];
        for (const rawEvent of rawEvents) {
            try {
                switch (rawEvent.identifier) {
                    case SWAP_IDENTIFIER.SWAP_FIXED_INPUT:
                    case SWAP_IDENTIFIER.SWAP_FIXED_OUTPUT:
                        [eventData, timestamp] =
                            this.swapHandlerService.handleSwapEvents(
                                new SwapEvent(rawEvent),
                            );
                        break;
                    case 'addLiquidity':
                        [eventData, timestamp] =
                            this.liquidityHandlerService.handleOldLiquidityEvent(
                                new AddLiquidityEvent(rawEvent),
                            );
                        break;
                    case 'removeLiquidity':
                        [eventData, timestamp] =
                            this.liquidityHandlerService.handleOldLiquidityEvent(
                                new RemoveLiquidityEvent(rawEvent),
                            );
                        break;
                    case 'deposit':
                        [eventData, timestamp] =
                            await this.priceDiscoveryHandlerService.handleOldPriceDiscoveryEvent(
                                new DepositEvent(rawEvent),
                            );
                        break;
                    case 'withdraw':
                        [eventData, timestamp] =
                            await this.priceDiscoveryHandlerService.handleOldPriceDiscoveryEvent(
                                new WithdrawEvent(rawEvent),
                            );
                        break;
                }
                this.updateIngestData(eventData);
            } catch (error) {
                this.logger.error(error);
            }
        }

        if (Object.keys(this.data).length > 0) {
            await this.analyticsWrite.ingest({
                data: this.data,
                Time: timestamp,
            });

            this.logger.info(
                `Ingested records for ${
                    Object.keys(this.data).length
                } series at timestamp ${timestamp}. Events processed: ${
                    rawEvents.length
                }`,
                {
                    context: 'AnalyticsIndexerService',
                },
            );
        }
    }

    private updateIngestData(eventData: any[]): void {
        for (const series of Object.keys(eventData)) {
            if (this.data[series] === undefined) {
                this.data[series] = {};
            }

            for (const measure of Object.keys(eventData[series])) {
                if (
                    measure.toLowerCase().includes('volume') ||
                    measure.toLowerCase().includes('fees')
                ) {
                    this.data[series][measure] = this.data[series][measure]
                        ? new BigNumber(this.data[series][measure])
                              .plus(eventData[series][measure])
                              .toFixed()
                        : eventData[series][measure];
                } else {
                    this.data[series][measure] = eventData[series][measure];
                }
            }
        }
    }
}
