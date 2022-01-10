import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CachingService } from 'src/services/caching/cache.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { constantsConfig } from 'src/config';
import { ExitFarmEvent } from 'src/modules/rabbitmq/entities/farm/exitFarm.event';
import { EsdtLocalBurnEvent } from 'src/modules/rabbitmq/entities/esdtToken/esdtLocalBurn.event';
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

@Injectable()
export class LogsProcessorService {
    isProcessing = false;
    feeMap: Map<number, string> = new Map();
    penaltyMap: Map<number, string> = new Map();

    constructor(
        private readonly cachingService: CachingService,
        private readonly apiService: ElrondApiService,
        private readonly elasticService: ElasticService,
        private readonly awsWrite: AWSTimestreamWriteService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_10_SECONDS)
    async handleNewLogs() {
        if (this.isProcessing) {
            return;
        }

        try {
            this.isProcessing = true;
            let lastProcessedTimestamp: number = await this.cachingService.getCache(
                'lastLogProcessedTimestamp',
            );

            let currentTimestamp: number;

            if (lastProcessedTimestamp === null) {
                lastProcessedTimestamp =
                    (await this.apiService.getShardTimestamp(1)) - oneMinute();
                currentTimestamp = lastProcessedTimestamp;
            } else {
                currentTimestamp =
                    (await this.apiService.getShardTimestamp(1)) - oneMinute();
            }

            if (currentTimestamp === lastProcessedTimestamp) {
                await this.cachingService.setCache(
                    'lastLogProcessedTimestamp',
                    currentTimestamp,
                );
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
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Nested('events', [
                QueryType.Match('events.identifier', swapType),
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

        const transactionsLogs = await this.elasticService.getList(
            'logs',
            '',
            elasticQueryAdapter,
        );

        let totalFeeBurned = new BigNumber(0);

        for (const transactionLogs of transactionsLogs) {
            const timestamp: number = transactionLogs._source.timestamp;
            const events = transactionLogs._source.events;

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
            totalFeeBurned = totalFeeBurned.plus(feeBurned);

            if (feeBurned === '0') {
                continue;
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
    }

    private async getExitFarmLogs(gte: number, lte: number) {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [
            QueryType.Nested('events', [
                QueryType.Match('events.identifier', 'exitFarm'),
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

        const transactionsLogs = await this.elasticService.getList(
            'logs',
            '',
            elasticQueryAdapter,
        );

        this.penaltyMap.clear();

        for (const transactionLogs of transactionsLogs) {
            const timestamp = transactionLogs._source.timestamp;
            const events = transactionLogs._source.events;

            let exitFarmEvent: ExitFarmEvent | undefined = undefined;
            const esdtLocalBurnEvents: EsdtLocalBurnEvent[] = [];

            for (const event of events) {
                switch (event.identifier) {
                    case 'exitFarm':
                        if (event.data === '') {
                            break;
                        }
                        exitFarmEvent = new ExitFarmEvent(event);
                        break;
                    case 'ESDTLocalBurn':
                        esdtLocalBurnEvents.push(new EsdtLocalBurnEvent(event));
                        break;
                    default:
                        break;
                }
            }

            if (exitFarmEvent === undefined) {
                continue;
            }

            const penaltyEntry = this.penaltyMap.get(timestamp);
            const penalty = this.getBurnedPenalty(
                exitFarmEvent,
                esdtLocalBurnEvents,
            );

            if (penalty === '0') {
                continue;
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

        const totalWriteRecords = await this.writeRecords(
            this.penaltyMap,
            'penaltyBurned',
        );

        this.logger.info(`penalty burned records ${totalWriteRecords}`);
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

        let totalTokenBurned = new BigNumber(0);
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

            totalTokenBurned = totalTokenBurned.plus(record);

            if (Records.length === 100) {
                try {
                    await this.awsWrite.multiRecordsIngest(
                        'tradingInfo',
                        Records,
                    );
                    totalWriteRecords += Records.length;
                    Records = [];
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
        }

        if (Records.length > 0) {
            try {
                await this.awsWrite.multiRecordsIngest('tradingInfo', Records);
                totalWriteRecords += Records.length;
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

        return totalWriteRecords;
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

    private getBurnedPenalty(
        exitFarmEvent: ExitFarmEvent,
        esdtLocalBurnEvents: EsdtLocalBurnEvent[],
    ): string {
        const lockedRewards = exitFarmEvent.toJSON().farmAttributes
            .lockedRewards;

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
                burnedAmount ===
                    exitFarmEvent.getRewardToken().amount.toFixed() &&
                lockedRewards
            ) {
                continue;
            }

            // Skip MEX to LKMEX farming tokens
            if (
                burnedAmount ===
                    exitFarmEvent.getFarmingToken().amount.toFixed() &&
                burnedTokenID === exitFarmEvent.getFarmingToken().tokenID
            ) {
                continue;
            }

            penalty = penalty.plus(burnedAmount);
        }

        return penalty.toFixed();
    }
}
