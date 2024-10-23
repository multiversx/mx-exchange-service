import { Inject, Injectable } from '@nestjs/common';
import { scAddress } from 'src/config';
import { ElasticSearchEventsService } from 'src/services/elastic-search/services/es.events.service';
import { convertEventTopicsAndDataToBase64 } from 'src/utils/elastic.search.utils';
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
import { IndexerStateService } from './indexer.state.service';
import { IndexerSwapHandlerService } from './event-handlers/indexer.swap.handler.service';
import { IndexerLiquidityHandlerService } from './event-handlers/indexer.liquidity.handler.service';
import { IndexerPriceDiscoveryHandlerService } from './event-handlers/indexer.price.discovery.handler.service';
import {
    IndexerEventIdentifiers,
    IndexerEventTypes,
} from '../entities/indexer.event.types';

@Injectable()
export class IndexerService {
    private filterAddresses: string[];
    private data: any[];
    private errorsCount = 0;
    private handleSwapEvents = false;
    private handleLiquidityEvents = false;
    private handlePriceDiscoveryEvents = false;
    private eventIdentifiers: string[];

    constructor(
        private readonly elasticEventsService: ElasticSearchEventsService,
        private readonly analyticsWrite: AnalyticsWriteService,
        private readonly stateService: IndexerStateService,
        private readonly swapHandlerService: IndexerSwapHandlerService,
        private readonly liquidityHandlerService: IndexerLiquidityHandlerService,
        private readonly priceDiscoveryHandlerService: IndexerPriceDiscoveryHandlerService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    public async indexAnalytics(
        startTimestamp: number,
        endTimestamp: number,
        eventTypes: IndexerEventTypes[],
    ): Promise<number> {
        await this.initIndexerState(startTimestamp, eventTypes);

        await this.fetchEvents(startTimestamp, endTimestamp);

        return this.errorsCount;
    }

    private async initIndexerState(
        startTimestamp: number,
        eventTypes: IndexerEventTypes[],
    ): Promise<void> {
        await this.stateService.initState(startTimestamp);

        this.filterAddresses = [];
        this.eventIdentifiers = [];
        this.errorsCount = 0;
        const pairs = this.stateService.getPairsMetadata();

        this.filterAddresses.push(...pairs.map((pair) => pair.address));
        this.filterAddresses.push(...scAddress.priceDiscovery);

        this.handleSwapEvents = eventTypes.includes(
            IndexerEventTypes.SWAP_EVENTS,
        );
        this.handleLiquidityEvents = eventTypes.includes(
            IndexerEventTypes.LIQUIDITY_EVENTS,
        );
        this.handlePriceDiscoveryEvents = eventTypes.includes(
            IndexerEventTypes.PRICE_DISCOVERY_EVENTS,
        );

        if (this.handleSwapEvents) {
            this.eventIdentifiers.push(
                IndexerEventIdentifiers.SWAP_FIXED_INPUT,
            );
            this.eventIdentifiers.push(
                IndexerEventIdentifiers.SWAP_FIXED_OUTPUT,
            );
        }

        if (this.handleLiquidityEvents) {
            this.eventIdentifiers.push(IndexerEventIdentifiers.ADD_LIQUIDITY);
            this.eventIdentifiers.push(
                IndexerEventIdentifiers.REMOVE_LIQUIDITY,
            );
        }

        if (this.handlePriceDiscoveryEvents) {
            this.eventIdentifiers.push(
                IndexerEventIdentifiers.PRICE_DISCOVERY_DEPOSIT,
            );
            this.eventIdentifiers.push(
                IndexerEventIdentifiers.PRICE_DISCOVERY_WITHDRAW,
            );
        }
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
                    this.incrementErrorsCount();
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
            this.eventIdentifiers,
            startTimestamp,
            endTimestamp,
            processEventsAction,
            5000,
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
                    case IndexerEventIdentifiers.SWAP_FIXED_INPUT:
                    case IndexerEventIdentifiers.SWAP_FIXED_OUTPUT:
                        if (!this.handleSwapEvents) {
                            break;
                        }
                        [eventData, timestamp] =
                            this.swapHandlerService.handleSwapEvent(
                                new SwapEvent(rawEvent),
                            );
                        break;
                    case IndexerEventIdentifiers.ADD_LIQUIDITY:
                        if (!this.handleLiquidityEvents) {
                            break;
                        }
                        [eventData, timestamp] =
                            this.liquidityHandlerService.handleLiquidityEvent(
                                new AddLiquidityEvent(rawEvent),
                            );
                        break;
                    case IndexerEventIdentifiers.REMOVE_LIQUIDITY:
                        if (!this.handleLiquidityEvents) {
                            break;
                        }
                        [eventData, timestamp] =
                            this.liquidityHandlerService.handleLiquidityEvent(
                                new RemoveLiquidityEvent(rawEvent),
                            );
                        break;
                    case IndexerEventIdentifiers.PRICE_DISCOVERY_DEPOSIT:
                        if (!this.handlePriceDiscoveryEvents) {
                            break;
                        }
                        [eventData, timestamp] =
                            this.priceDiscoveryHandlerService.handlePriceDiscoveryEvent(
                                new DepositEvent(rawEvent),
                            );
                        break;
                    case IndexerEventIdentifiers.PRICE_DISCOVERY_WITHDRAW:
                        if (!this.handlePriceDiscoveryEvents) {
                            break;
                        }
                        [eventData, timestamp] =
                            this.priceDiscoveryHandlerService.handlePriceDiscoveryEvent(
                                new WithdrawEvent(rawEvent),
                            );
                        break;
                }
                this.updateIngestData(eventData);
            } catch (error) {
                this.logger.error(error);
                this.incrementErrorsCount();
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
                    context: 'IndexerService',
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

    private incrementErrorsCount(): void {
        this.errorsCount += 1;
    }
}
