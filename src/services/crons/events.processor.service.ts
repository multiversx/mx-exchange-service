import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from 'src/services/caching/cache.service';
import { MXApiService } from '../multiversx-communication/mx.api.service';
import { cacheConfig, constantsConfig } from 'src/config';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateLogMessage } from 'src/utils/generate-log-message';
import {
    BaseFarmEvent,
    EsdtLocalBurnEvent,
    ExitFarmEventV1_2,
    ExitFarmEventV1_3,
    ExitFarmEventV2,
    TRANSACTION_EVENTS,
} from '@multiversx/sdk-exchange';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { AnalyticsWriteService } from '../analytics/services/analytics.write.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { IngestRecord } from '../analytics/entities/ingest.record';
import { SWAP_IDENTIFIER } from 'src/modules/rabbitmq/handlers/pair.swap.handler.service';
import { ElasticSearchEventsService } from '../elastic-search/services/es.events.service';
import { RawElasticEventType } from '../elastic-search/entities/raw.elastic.event';
import { convertEventTopicsAndDataToBase64 } from 'src/utils/elastic.search.utils';
import { Constants } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class EventsProcessorService {
    isProcessing = false;
    feeMap: Map<number, string> = new Map();
    penaltyMap: Map<number, string> = new Map();

    constructor(
        private readonly cachingService: CacheService,
        private readonly apiService: MXApiService,
        private readonly elasticEventsService: ElasticSearchEventsService,
        private readonly analyticsWrite: AnalyticsWriteService,
        private readonly apiConfig: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async handleNewEvents() {
        if (this.isProcessing || process.env.NODE_ENV === 'shadowfork2') {
            return;
        }

        try {
            this.isProcessing = true;

            const [lastProcessedTimestamp, currentTimestamp] =
                await this.getProcessingInterval(Constants.oneMinute());
            if (lastProcessedTimestamp === currentTimestamp) {
                return;
            }

            await this.getFeeBurned(currentTimestamp, lastProcessedTimestamp);
            await this.getPenaltyBurned(
                currentTimestamp,
                lastProcessedTimestamp,
            );

            await this.cachingService.set(
                'lastLogProcessedTimestamp',
                currentTimestamp,
                cacheConfig.default,
            );
        } catch (error) {
            const logMessage = generateLogMessage(
                EventsProcessorService.name,
                this.handleNewEvents.name,
                '',
                error,
            );
            this.logger.error(logMessage);
        } finally {
            this.isProcessing = false;
        }
    }

    private async getProcessingInterval(
        delay: number,
    ): Promise<[number, number]> {
        let lastProcessedTimestamp: number = await this.cachingService.get(
            'lastLogProcessedTimestamp',
        );

        let currentTimestamp: number;

        if (!lastProcessedTimestamp || lastProcessedTimestamp === undefined) {
            lastProcessedTimestamp =
                (await this.apiService.getShardTimestamp(1)) - delay;
            currentTimestamp = lastProcessedTimestamp;
        } else {
            currentTimestamp =
                (await this.apiService.getShardTimestamp(1)) - delay;
        }

        if (currentTimestamp === lastProcessedTimestamp) {
            await this.cachingService.set(
                'lastLogProcessedTimestamp',
                currentTimestamp,
                cacheConfig.default,
            );
        }

        return [lastProcessedTimestamp, currentTimestamp];
    }

    private async getFeeBurned(
        currentTimestamp: number,
        lastProcessedTimestamp: number,
    ): Promise<void> {
        this.feeMap.clear();

        await this.getSwapAndBurnEvents(
            currentTimestamp,
            lastProcessedTimestamp,
        );

        const totalWriteRecords = await this.writeRecords(
            this.feeMap,
            'feeBurned',
        );

        this.logger.info(`fee burned records: ${totalWriteRecords}`);
    }

    private async getPenaltyBurned(
        currentTimestamp: number,
        lastProcessedTimestamp: number,
    ): Promise<void> {
        this.penaltyMap.clear();

        await this.getExitFarmAndBurnEvents(
            currentTimestamp,
            lastProcessedTimestamp,
        );

        const totalWriteRecords = await this.writeRecords(
            this.penaltyMap,
            'penaltyBurned',
        );

        this.logger.info(`penalty burned records ${totalWriteRecords}`);
    }

    private async getSwapAndBurnEvents(
        currentTimestamp: number,
        lastProcessedTimestamp: number,
    ): Promise<void> {
        const transactionsEvents: Map<string, RawElasticEventType[]> =
            new Map();
        const processEventsAction = async (events: any[]): Promise<void> => {
            for (const originalEvent of events) {
                const event = convertEventTopicsAndDataToBase64(originalEvent);

                if (transactionsEvents.has(event.txHash)) {
                    const txEvents = transactionsEvents.get(event.txHash);
                    txEvents.push(event);
                    transactionsEvents.set(event.txHash, txEvents);
                } else {
                    transactionsEvents.set(event.txHash, [event]);
                }
            }
        };

        await this.elasticEventsService.getEvents(
            [
                SWAP_IDENTIFIER.SWAP_FIXED_INPUT,
                SWAP_IDENTIFIER.SWAP_FIXED_OUTPUT,
                TRANSACTION_EVENTS.ESDT_LOCAL_BURN,
            ],
            lastProcessedTimestamp,
            currentTimestamp,
            processEventsAction,
            500,
        );

        this.processSwapTransactionsEvents(transactionsEvents);
    }

    private async getExitFarmAndBurnEvents(
        currentTimestamp: number,
        lastProcessedTimestamp: number,
    ): Promise<void> {
        const transactionsEvents: Map<string, RawElasticEventType[]> =
            new Map();
        const processEventsAction = async (events: any[]): Promise<void> => {
            for (const originalEvent of events) {
                const event = convertEventTopicsAndDataToBase64(originalEvent);

                if (transactionsEvents.has(event.txHash)) {
                    const txEvents = transactionsEvents.get(event.txHash);
                    txEvents.push(event);
                    transactionsEvents.set(event.txHash, txEvents);
                } else {
                    transactionsEvents.set(event.txHash, [event]);
                }
            }
        };

        await this.elasticEventsService.getEvents(
            ['exitFarm', TRANSACTION_EVENTS.ESDT_LOCAL_BURN],
            lastProcessedTimestamp,
            currentTimestamp,
            processEventsAction,
            500,
        );

        this.processExitFarmTransactionsEvents(transactionsEvents);
    }

    private processSwapTransactionsEvents(
        transactionEvents: Map<string, RawElasticEventType[]>,
    ): void {
        const txHashes = transactionEvents.keys();
        for (const txHash of txHashes) {
            const events = transactionEvents.get(txHash);

            const hasSwapEvents = events.findIndex(
                (event) =>
                    event.identifier === SWAP_IDENTIFIER.SWAP_FIXED_INPUT ||
                    event.identifier === SWAP_IDENTIFIER.SWAP_FIXED_OUTPUT,
            );

            if (hasSwapEvents === -1) {
                continue;
            }

            const burnEvents = events
                .filter(
                    (event) =>
                        event.identifier === TRANSACTION_EVENTS.ESDT_LOCAL_BURN,
                )
                .map((event) => new EsdtLocalBurnEvent(event));

            this.processSwapLocalBurnEvents(burnEvents, events[0].timestamp);
        }
    }

    private processExitFarmTransactionsEvents(
        transactionEvents: Map<string, RawElasticEventType[]>,
    ): void {
        const txHashes = transactionEvents.keys();
        for (const txHash of txHashes) {
            const events = transactionEvents.get(txHash);

            const burnEvents: EsdtLocalBurnEvent[] = [];
            let exitFarmEvent: BaseFarmEvent | ExitFarmEventV2 | undefined =
                undefined;

            events.forEach((event) => {
                switch (event.identifier) {
                    case 'exitFarm':
                        if (event.data === '') {
                            break;
                        }
                        const version = farmVersion(event.address);
                        switch (version) {
                            case FarmVersion.V1_2:
                                exitFarmEvent = new ExitFarmEventV1_2(event);
                                break;
                            case FarmVersion.V1_3:
                                exitFarmEvent = new ExitFarmEventV1_3(event);
                                break;
                            case FarmVersion.V2:
                                if (event.topics.length !== 6) {
                                    break;
                                }
                                exitFarmEvent = new ExitFarmEventV2(event);
                                break;
                        }
                        break;
                    case TRANSACTION_EVENTS.ESDT_LOCAL_BURN:
                        burnEvents.push(new EsdtLocalBurnEvent(event));
                        break;
                    default:
                        break;
                }
            });

            if (exitFarmEvent === undefined) {
                continue;
            }

            this.processExitFarmEvents(
                exitFarmEvent,
                burnEvents,
                events[0].timestamp,
            );
        }
    }

    private async writeRecords(
        recordsMap: Map<number, string>,
        MeasureName: string,
    ): Promise<number> {
        let Records: IngestRecord[] = [];

        let totalWriteRecords = 0;

        for (const timestamp of recordsMap.keys()) {
            const record = recordsMap.get(timestamp);
            if (record === undefined) {
                continue;
            }

            Records.push({
                series: constantsConfig.MEX_TOKEN_ID,
                key: MeasureName,
                value: record,
                timestamp,
            });

            if (Records.length === 100) {
                totalWriteRecords += await this.pushRecords(Records);
                Records = [];
            }
        }

        if (Records.length > 0) {
            totalWriteRecords += await this.pushRecords(Records);
        }

        return totalWriteRecords;
    }

    private async pushRecords(Records: IngestRecord[]): Promise<number> {
        if (!this.apiConfig.isAWSTimestreamWrite()) {
            return 0;
        }

        try {
            await this.analyticsWrite.multiRecordsIngest(Records);
            return Records.length;
        } catch (error) {
            const logMessage = generateLogMessage(
                EventsProcessorService.name,
                this.writeRecords.name,
                '',
                error,
            );
            this.logger.error(logMessage);
        }
    }

    private getBurnedFee(esdtLocalBurnEvents: EsdtLocalBurnEvent[]): string {
        let fee = new BigNumber(0);
        for (const localBurn of esdtLocalBurnEvents) {
            const burnedTokenID = localBurn.getTopics().tokenID;
            const burnedAmount = localBurn.getTopics().amount;

            if (burnedTokenID !== constantsConfig.MEX_TOKEN_ID) {
                continue;
            }

            fee = fee.plus(burnedAmount);
        }

        return fee.toFixed();
    }

    private processSwapLocalBurnEvents(
        events: EsdtLocalBurnEvent[],
        timestamp: number,
    ): void {
        const feeBurned = this.getBurnedFee(events);

        if (feeBurned === '0') {
            return;
        }

        const feeEntry = this.feeMap.get(timestamp);

        if (feeEntry) {
            this.feeMap.set(
                timestamp,
                new BigNumber(feeEntry).plus(feeBurned).toFixed(),
            );
        } else {
            this.feeMap.set(timestamp, feeBurned);
        }
    }

    private processExitFarmEvents(
        exitFarmEvent: BaseFarmEvent | ExitFarmEventV2,
        burnEvents: EsdtLocalBurnEvent[] = [],
        timestamp: number,
    ): Promise<void> {
        const penalty = this.getBurnedPenalty(exitFarmEvent, burnEvents);

        if (penalty === '0') {
            return;
        }

        const penaltyEntry = this.penaltyMap.get(timestamp);

        if (penaltyEntry) {
            this.penaltyMap.set(
                timestamp,
                new BigNumber(penaltyEntry).plus(penalty).toFixed(),
            );
        } else {
            this.penaltyMap.set(timestamp, penalty);
        }
    }

    private getBurnedPenalty(
        exitFarmEvent: BaseFarmEvent | ExitFarmEventV2,
        esdtLocalBurnEvents: EsdtLocalBurnEvent[],
    ): string {
        if (!(exitFarmEvent instanceof ExitFarmEventV2)) {
            return this.getBurnedPenaltyOldFarms(
                exitFarmEvent,
                esdtLocalBurnEvents,
            );
        }

        let penalty = new BigNumber(0);

        esdtLocalBurnEvents
            .filter(
                (event) =>
                    event.getTopics().tokenID === constantsConfig.MEX_TOKEN_ID,
            )
            .forEach((event) => {
                penalty = penalty.plus(event.getTopics().amount);
            });

        return penalty.toFixed();
    }

    private getBurnedPenaltyOldFarms(
        exitFarmEvent: BaseFarmEvent,
        esdtLocalBurnEvents: EsdtLocalBurnEvent[],
    ): string {
        const lockedRewards =
            exitFarmEvent instanceof ExitFarmEventV1_2
                ? exitFarmEvent.toJSON().farmAttributes.lockedRewards
                : undefined;

        let penalty = new BigNumber(0);

        for (const localBurn of esdtLocalBurnEvents) {
            const burnedTokenID = localBurn.getTopics().tokenID;
            const burnedAmount = localBurn.getTopics().amount;

            // Skip LP tokens burn
            if (burnedTokenID !== constantsConfig.MEX_TOKEN_ID) {
                continue;
            }

            // Skip MEX to LKMEX rewards for V1_2 farms
            if (
                burnedAmount === exitFarmEvent.rewardToken.amount.toFixed() &&
                lockedRewards
            ) {
                continue;
            }

            // Skip MEX to LKMEX farming tokens
            if (
                burnedAmount === exitFarmEvent.farmingToken.amount.toFixed() &&
                burnedTokenID === exitFarmEvent.farmingToken.tokenID
            ) {
                continue;
            }

            penalty = penalty.plus(burnedAmount);
        }

        return penalty.toFixed();
    }
}
