import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CachingService } from 'src/services/caching/cache.service';
import { MXApiService } from '../multiversx-communication/mx.api.service';
import { constantsConfig } from 'src/config';
import BigNumber from 'bignumber.js';
import { ElasticQuery } from 'src/helpers/entities/elastic/elastic.query';
import { QueryType } from 'src/helpers/entities/elastic/query.type';
import { ElasticSortOrder } from 'src/helpers/entities/elastic/elastic.sort.order';
import { ElasticService } from 'src/helpers/elastic.service';
import { oneMinute } from 'src/helpers/helpers';
import { AWSTimestreamWriteService } from '../aws/aws.timestream.write';
import { TimestreamWrite } from 'aws-sdk';
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
import { ApiConfigService } from 'src/helpers/api.config.service';

@Injectable()
export class LogsProcessorService {
    isProcessing = false;
    feeMap: Map<number, string> = new Map();
    penaltyMap: Map<number, string> = new Map();

    constructor(
        private readonly cachingService: CachingService,
        private readonly apiService: MXApiService,
        private readonly elasticService: ElasticService,
        private readonly awsWrite: AWSTimestreamWriteService,
        private readonly apiConfig: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async handleNewLogs() {
        if (this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;

            const [lastProcessedTimestamp, currentTimestamp] =
                await this.getProcessingInterval(oneMinute());
            if (lastProcessedTimestamp === currentTimestamp) {
                return;
            }

            await this.getFeeBurned(currentTimestamp, lastProcessedTimestamp);
            await this.getExitFarmLogs(
                currentTimestamp,
                lastProcessedTimestamp,
            );

            await this.cachingService.setCache(
                'lastLogProcessedTimestamp',
                currentTimestamp,
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
        let lastProcessedTimestamp: number = await this.cachingService.getCache(
            'lastLogProcessedTimestamp',
        );

        let currentTimestamp: number;

        if (lastProcessedTimestamp === null) {
            lastProcessedTimestamp =
                (await this.apiService.getShardTimestamp(1)) - delay;
            currentTimestamp = lastProcessedTimestamp;
        } else {
            currentTimestamp =
                (await this.apiService.getShardTimestamp(1)) - delay;
        }

        if (currentTimestamp === lastProcessedTimestamp) {
            await this.cachingService.setCache(
                'lastLogProcessedTimestamp',
                currentTimestamp,
            );
        }

        return [lastProcessedTimestamp, currentTimestamp];
    }

    private async getFeeBurned(gte: number, lte: number) {
        this.feeMap.clear();
        await this.getSwapLogs('swapTokensFixedInput', gte, lte);
        await this.getSwapLogs('swapTokensFixedOutput', gte, lte);

        const totalWriteRecords = await this.writeRecords(
            this.feeMap,
            'feeBurned',
        );

        this.logger.info(`fee burned records: ${totalWriteRecords}`);
    }

    private async getSwapLogs(swapType: string, gte: number, lte: number) {
        const transactionsLogs = await this.getTransactionsLogs(
            swapType,
            gte,
            lte,
        );

        for (const transactionLogs of transactionsLogs) {
            const timestamp: number = transactionLogs._source.timestamp;
            const events = transactionLogs._source.events;
            this.processSwapEvents(events, timestamp);
        }
    }

    private async getExitFarmLogs(gte: number, lte: number) {
        const transactionsLogs = await this.getTransactionsLogs(
            'exitFarm',
            gte,
            lte,
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
        gte: number,
        lte: number,
    ): Promise<any[]> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Nested('events', [
                QueryType.Match('events.identifier', eventName),
            ]),
        ];

        elasticQueryAdapter.filter = [
            QueryType.Range('timestamp', {
                before: gte,
                after: lte,
            }),
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
        const Dimensions = [
            { Name: 'series', Value: constantsConfig.MEX_TOKEN_ID },
        ];
        const MeasureValueType = 'DOUBLE';
        let Records: TimestreamWrite.Records = [];

        let totalWriteRecords = 0;

        for (const key of recordsMap.keys()) {
            const record = recordsMap.get(key);
            if (record === undefined) {
                continue;
            }

            Records.push({
                Dimensions,
                MeasureName,
                MeasureValue: record,
                MeasureValueType,
                Time: key.toString(),
                TimeUnit: 'SECONDS',
                Version: Date.now(),
            });

            if (Records.length === 100) {
                totalWriteRecords += await this.pushAWSRecords(Records);
                Records = [];
            }
        }

        if (Records.length > 0) {
            totalWriteRecords += await this.pushAWSRecords(Records);
        }

        return totalWriteRecords;
    }

    private async pushAWSRecords(
        Records: TimestreamWrite.Records,
    ): Promise<number> {
        if (!this.apiConfig.isAWSTimestreamWrite()) {
            return 0;
        }

        try {
            await this.awsWrite.multiRecordsIngest(
                this.apiConfig.getAWSTableName(),
                Records,
            );
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
