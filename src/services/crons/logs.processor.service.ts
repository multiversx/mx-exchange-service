import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { MXApiService } from '../multiversx-communication/mx.api.service';
import { cacheConfig, constantsConfig } from 'src/config';
import BigNumber from 'bignumber.js';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateLogMessage } from 'src/utils/generate-log-message';
import {
    BaseFarmEvent,
    EsdtLocalBurnEvent,
    ExitFarmEventV1_2,
    ExitFarmEventV1_3,
} from '@multiversx/sdk-exchange';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { AnalyticsWriteService } from '../analytics/services/analytics.write.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { IngestRecord } from '../analytics/entities/ingest.record';
import {
    ElasticQuery,
    ElasticSortOrder,
    QueryType,
} from '@multiversx/sdk-nestjs-elastic';
import { ElasticService } from 'src/helpers/elastic.service';

@Injectable()
export class LogsProcessorService {
    isProcessing = false;
    feeMap: Map<number, string> = new Map();
    penaltyMap: Map<number, string> = new Map();

    constructor(
        private readonly cachingService: CacheService,
        private readonly apiService: MXApiService,
        private readonly elasticService: ElasticService,
        private readonly analyticsWrite: AnalyticsWriteService,
        private readonly apiConfig: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async handleNewLogs() {
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
            await this.getExitFarmLogs(
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
                LogsProcessorService.name,
                this.handleNewLogs.name,
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
    ) {
        this.feeMap.clear();
        await this.getSwapLogs(
            'swapTokensFixedInput',
            currentTimestamp,
            lastProcessedTimestamp,
        );
        await this.getSwapLogs(
            'swapTokensFixedOutput',
            currentTimestamp,
            lastProcessedTimestamp,
        );

        const totalWriteRecords = await this.writeRecords(
            this.feeMap,
            'feeBurned',
        );

        this.logger.info(`fee burned records: ${totalWriteRecords}`);
    }

    private async getSwapLogs(
        swapType: string,
        currentTimestamp: number,
        lastProcessedTimestamp: number,
    ) {
        const transactionsLogs = await this.getTransactionsLogs(
            swapType,
            currentTimestamp,
            lastProcessedTimestamp,
        );

        for (const transactionLogs of transactionsLogs) {
            const timestamp: number = transactionLogs._source.timestamp;
            const events = transactionLogs._source.events;
            this.processSwapEvents(events, timestamp);
        }
    }

    private async getExitFarmLogs(
        currentTimestamp: number,
        lastProcessedTimestamp: number,
    ) {
        const transactionsLogs = await this.getTransactionsLogs(
            'exitFarm',
            currentTimestamp,
            lastProcessedTimestamp,
        );

        this.penaltyMap.clear();

        for (const transactionLogs of transactionsLogs) {
            const timestamp = transactionLogs._source.timestamp;
            const events = transactionLogs._source.events;

            this.processExitFarmEvents(events, timestamp);
        }

        const totalWriteRecords = await this.writeRecords(
            this.penaltyMap,
            'penaltyBurned',
        );

        this.logger.info(`penalty burned records ${totalWriteRecords}`);
    }

    private async getTransactionsLogs(
        eventName: string,
        currentTimestamp: number,
        lastProcessedTimestamp: number,
    ): Promise<any[]> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Nested('events', [
                QueryType.Match('events.identifier', eventName),
            ]),
        ];

        elasticQueryAdapter.filter = [
            QueryType.Range(
                'timestamp',
                {
                    key: 'gte',
                    value: lastProcessedTimestamp,
                },
                {
                    key: 'lte',
                    value: currentTimestamp,
                },
            ),
        ];

        elasticQueryAdapter.sort = [
            { name: 'timestamp', order: ElasticSortOrder.ascending },
        ];

        return await this.elasticService.getList(
            'logs',
            '',
            elasticQueryAdapter,
        );
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
                LogsProcessorService.name,
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

    private processSwapEvents(events: any[], timestamp: number): Promise<void> {
        const esdtLocalBurnEvents: EsdtLocalBurnEvent[] = [];

        for (const event of events) {
            switch (event.identifier) {
                case 'ESDTLocalBurn':
                    esdtLocalBurnEvents.push(new EsdtLocalBurnEvent(event));
                    break;
                default:
                    break;
            }
        }

        const feeBurned = this.getBurnedFee(esdtLocalBurnEvents);

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
        events: any[],
        timestamp: number,
    ): Promise<void> {
        let exitFarmEvent: BaseFarmEvent | undefined = undefined;
        const esdtLocalBurnEvents: EsdtLocalBurnEvent[] = [];

        for (const event of events) {
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
                    }
                    break;
                case 'ESDTLocalBurn':
                    esdtLocalBurnEvents.push(new EsdtLocalBurnEvent(event));
                    break;
                default:
                    break;
            }
        }

        if (exitFarmEvent === undefined) {
            return;
        }

        const penaltyEntry = this.penaltyMap.get(timestamp);
        const penalty = this.getBurnedPenalty(
            exitFarmEvent,
            esdtLocalBurnEvents,
        );

        if (penalty === '0') {
            return;
        }

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
