import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
    nowUtc,
    oneMinute,
    splitDateRangeIntoIntervalsUtc,
} from '../../../helpers/helpers';
import { ElasticQuery } from 'src/helpers/entities/elastic/elastic.query';
import { QueryType } from 'src/helpers/entities/elastic/query.type';
import { ElasticSortOrder } from 'src/helpers/entities/elastic/elastic.sort.order';
import { ElasticService } from 'src/helpers/elastic.service';
import {
    AddLiquidityEvent,
    DepositEvent,
    PAIR_EVENTS,
    PRICE_DISCOVERY_EVENTS,
    RemoveLiquidityEvent,
    SwapFixedInputEvent,
    SwapFixedOutputEvent,
    WithdrawEvent,
} from '@elrondnetwork/erdjs-dex';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Locker } from 'src/utils/locker';
import { ElrondDataService } from 'src/services/elrond-communication/elrond-data.service';
import BigNumber from 'bignumber.js';
import {
    constantsConfig,
    elrondConfig,
    elrondData,
    tokenProviderUSD,
} from 'src/config';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { quote } from 'src/modules/pair/pair.utils';
import { PairInfoModel } from 'src/modules/pair/models/pair-info.model';
import { denominateAmount } from 'src/utils/token.converters';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { AnalyticsReindexRepositoryService } from 'src/services/database/repositories/analytics.reindex.state.repository';
import { AnalyticsReindexState } from 'src/modules/remote-config/schemas/analytics.reindex.state.schema';
import { IngestRecord } from 'src/services/elrond-communication/ingest-records.model';
import * as fs from 'fs';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';

@Injectable()
export class AnalyticsReindexService {
    private readonly wegldID = tokenProviderUSD;
    private state: AnalyticsReindexState;
    private pairsMap: Map<string, string[]>;
    private launchedTokensDecimals: { [key: string]: number } = {};

    private readonly dataApiIngest: boolean = true;
    private readonly localIngestFolder: string = 'localIngest';

    // speed measuring variables
    private ingestedCnt: number = 0;
    private processStartTime: number;

    private ingestRecordsThreshold = 500;
    private ingestPromisesThreshold = 10;

    private ingestRecordsBuffer: IngestRecord[] = [];
    private ingestRecordsPromises: Promise<boolean>[] = [];

    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly elrondDataService: ElrondDataService,
        private readonly elasticService: ElasticService,
        private readonly elrondApiService: ElrondApiService,
        @Inject(forwardRef(() => PairGetterService))
        private readonly pairGetterService: PairGetterService,
        private schedulerRegistry: SchedulerRegistry,
        private readonly routerGetterService: RouterGetterService,
        private readonly tokenGetterService: TokenGetterService,
        private readonly analyticsReindexRepositoryService: AnalyticsReindexRepositoryService,
    ) {
        // manually start cronjob; todo: find out why not starting automatically...
        const job = new CronJob(CronExpression.EVERY_SECOND, () => {
            this.reindexEvents();
        });
        this.schedulerRegistry.addCronJob(this.reindexEvents.name, job);
        job.start();
    }

    @Cron(CronExpression.EVERY_SECOND)
    private async reindexEvents(): Promise<void> {
        await Locker.lock(this.reindexEvents.name, async () => {
            await this.reindexAnalytics();
        });
        this.stopReindexingEvents();
    }

    private stopReindexingEvents(): void {
        const job = this.schedulerRegistry.getCronJob(this.reindexEvents.name);
        job.stop();
    }

    private async reindexAnalytics(): Promise<boolean> {
        await this.initReindexState();

        if (!this.dataApiIngest && !fs.existsSync(this.localIngestFolder)) {
            fs.mkdirSync(this.localIngestFolder);
        }

        if (!this.processStartTime) {
            this.processStartTime = new Date().getTime();
        }

        const startDateUtc =
            this.state.lastIntervalStartDate ?? elrondData.indexingStartTimeUtc;
        const endDateUtc = nowUtc();

        const batchRangeInSeconds = 10 * oneMinute();
        const dateIntervals = splitDateRangeIntoIntervalsUtc(
            startDateUtc,
            endDateUtc,
            batchRangeInSeconds,
        );

        this.saveLogData(
            `reindexAnalytics started from startDateUtc ${startDateUtc}`,
        );

        const eventNames = [
            PAIR_EVENTS.ADD_LIQUIDITY,
            PAIR_EVENTS.REMOVE_LIQUIDITY,
            PAIR_EVENTS.SWAP_FIXED_INPUT,
            PAIR_EVENTS.SWAP_FIXED_OUTPUT,
            PRICE_DISCOVERY_EVENTS.DEPOSIT,
            PRICE_DISCOVERY_EVENTS.WITHDARW,
        ];

        let nextEventGroupPromise: Promise<any>;

        for (let i = 0; i < dateIntervals.length - 1; i++) {
            const lte = new Date(dateIntervals[i]).getTime() / 1000;
            const gte = new Date(dateIntervals[i + 1]).getTime() / 1000;

            this.saveLogData(`Reindexing interval gte ${lte} -> lte ${gte}`);

            const eventGroups =
                (await nextEventGroupPromise) ??
                (await this.getEventsOrderedByTimestamp(gte, lte, eventNames));

            if (i > dateIntervals.length - 2) {
                const nextGte = new Date(dateIntervals[i + 2]).getTime() / 1000;
                nextEventGroupPromise = this.getEventsOrderedByTimestamp(
                    nextGte,
                    gte,
                    eventNames,
                );
            }

            await this.processEvents(eventGroups);

            await Promise.all([
                this.ingestLastRecords(),
                this.saveState(dateIntervals[i + 1]),
            ]);

            this.logPerformanceAndReset();
        }

        return true;
    }

    private async getEventsOrderedByTimestamp(
        gte: number,
        lte: number,
        eventNames: string[],
    ): Promise<any> {
        let eventGroups = [];

        for (const eventName of eventNames) {
            eventGroups = eventGroups.concat(
                await this.getTransactionsLogs(eventName, gte, lte),
            );
        }

        eventGroups.sort(function (a, b) {
            return (
                new Date(a._source.timestamp).getTime() -
                new Date(b._source.timestamp).getTime()
            );
        });

        return eventGroups;
    }

    private async processEvents(eventGroups: any[]): Promise<void> {
        for (const eventGroup of eventGroups) {
            for (const rawEvent of eventGroup._source.events) {
                switch (rawEvent?.identifier) {
                    case PAIR_EVENTS.SWAP_FIXED_INPUT: {
                        try {
                            const event = new SwapFixedInputEvent(rawEvent);
                            await this.handleOldSwapEvents(event);
                        } finally {
                            break;
                        }
                    }
                    case PAIR_EVENTS.SWAP_FIXED_OUTPUT: {
                        try {
                            const event = new SwapFixedOutputEvent(rawEvent);
                            await this.handleOldSwapEvents(event);
                        } finally {
                            break;
                        }
                    }
                    case PAIR_EVENTS.ADD_LIQUIDITY: {
                        try {
                            const event = new AddLiquidityEvent(rawEvent);
                            await this.handleOldLiqudityEvent(event);
                        } finally {
                            break;
                        }
                    }
                    case PAIR_EVENTS.REMOVE_LIQUIDITY: {
                        try {
                            const event = new RemoveLiquidityEvent(rawEvent);
                            await this.handleOldLiqudityEvent(event);
                        } finally {
                            break;
                        }
                    }
                    case PRICE_DISCOVERY_EVENTS.DEPOSIT: {
                        try {
                            const event = new DepositEvent(rawEvent);
                            await this.handleOldPriceDiscoveryEvent(event);
                        } finally {
                            break;
                        }
                    }
                    case PRICE_DISCOVERY_EVENTS.WITHDARW: {
                        try {
                            const event = new WithdrawEvent(rawEvent);
                            await this.handleOldPriceDiscoveryEvent(event);
                        } finally {
                            break;
                        }
                    }
                }
            }
        }
    }

    private async initReindexState(): Promise<void> {
        await this.initState();
        await this.refreshPairsMap();
    }

    private async initState(): Promise<void> {
        if (this.state === undefined) {
            this.state = await this.analyticsReindexRepositoryService.findOne(
                {},
            );

            if (!this.state) {
                this.state = new AnalyticsReindexState();
            }

            try {
                let pairsMetadata: PairMetadata[] =
                    await this.routerGetterService.getPairsMetadata();
                for (const pair of pairsMetadata) {
                    if (this.state.pairsState[pair.address]) {
                        continue;
                    }

                    this.state.pairsState[pair.address] = {
                        firstTokenID: pair.firstTokenID,
                        secondTokenID: pair.secondTokenID,
                        firstTokenReserves: '0',
                        secondTokenReserves: '0',
                        liquidityPoolSupply: '0',
                    };
                }
            } catch (error) {
                this.saveLogData(
                    `Error when trying to add all existing pairs to the local pairs ${error}`,
                );
                throw error;
            }
        }
    }

    private async refreshPairsMap(): Promise<Map<string, string[]>> {
        try {
            let pairsMetadata: PairMetadata[] =
                await this.getAllPairsMetadata();

            const pairsMap = new Map<string, string[]>();
            for (const pairMetadata of pairsMetadata) {
                pairsMap.set(pairMetadata.firstTokenID, []);
                pairsMap.set(pairMetadata.secondTokenID, []);
            }

            pairsMetadata.forEach((pair) => {
                pairsMap.get(pair.firstTokenID).push(pair.secondTokenID);
                pairsMap.get(pair.secondTokenID).push(pair.firstTokenID);
            });

            this.pairsMap = pairsMap;

            return this.pairsMap;
        } catch (error) {
            throw error;
        }
    }

    private async updatePairState(
        pairAddress: string,
        pairData: any,
    ): Promise<void> {
        if (this.state.pairsState[pairAddress] === undefined) {
            await this.refreshPairsMap();
        } else if (this.state.pairsState[pairAddress] === null) {
            throw new Error(
                `Can't update pairs state for ${pairAddress} - ${pairData}`,
            );
        }

        this.state.pairsState[pairAddress] = pairData;
    }

    private async saveState(lastIntervalStartDate: string): Promise<void> {
        this.state.lastIntervalStartDate = lastIntervalStartDate;
        const res =
            await this.analyticsReindexRepositoryService.findOneAndUpdate(
                {},
                this.state,
            );
        if (!res) {
            await this.analyticsReindexRepositoryService.create(this.state);
        }
    }

    private async updatePairStateForLiquidityEvent(
        event: AddLiquidityEvent | RemoveLiquidityEvent,
    ): Promise<void> {
        await this.updatePairState(event.address, {
            firstTokenID: event.getFirstToken().tokenID,
            secondTokenID: event.getSecondToken().tokenID,
            firstTokenReserves: event.getFirstTokenReserves(),
            secondTokenReserves: event.getSecondTokenReserves(),
            liquidityPoolSupply: event.getLiquidityPoolSupply(),
        });
    }

    private async updatePairStateForSwapEvent(
        event: SwapFixedInputEvent | SwapFixedOutputEvent,
    ): Promise<void> {
        if (!this.state.pairsState[event.address]) {
            const firstTokenID = await this.pairGetterService.getFirstTokenID(
                event.address,
            );
            this.state.pairsState[event.address] = {
                firstTokenID: firstTokenID,
                secondTokenID: '',
                firstTokenReserves: '0',
                secondTokenReserves: '0',
                liquidityPoolSupply: '0',
            };
        }

        if (
            this.state.pairsState[event.address].firstTokenID ===
            event.getTokenIn().tokenID
        ) {
            await this.updatePairState(event.address, {
                firstTokenID: event.getTokenIn().tokenID,
                secondTokenID: event.getTokenOut().tokenID,
                firstTokenReserves: event.getTokenInReserves().toString(),
                secondTokenReserves: event.getTokenOutReserves().toString(),
                liquidityPoolSupply:
                    this.state.pairsState[event.address]?.liquidityPoolSupply ??
                    '0',
            });
        } else {
            await this.updatePairState(event.address, {
                firstTokenID: event.getTokenOut().tokenID,
                secondTokenID: event.getTokenIn().tokenID,
                firstTokenReserves: event.getTokenOutReserves().toString(),
                secondTokenReserves: event.getTokenInReserves().toString(),
                liquidityPoolSupply:
                    this.state.pairsState[event.address]?.liquidityPoolSupply ??
                    '0',
            });
        }
    }

    private saveLogData(logData: any): void {
        this.logger.info(logData);
        console.log(logData);
    }

    private getLocalIngestFileName(timestamp: number): string {
        const date = new Date(timestamp * 1000);
        return `${date.getFullYear()}-${date.getMonth() + 1}-${
            date.getDay() + 1
        }.json`;
    }

    private logPerformanceAndReset(): void {
        if (this.ingestedCnt !== 0) {
            const end = new Date().getTime();
            const seconds = (end - this.processStartTime) / 1000;
            this.saveLogData(
                `ing/s = ${Math.round(this.ingestedCnt / seconds)}`,
            );

            this.ingestedCnt = 0;
        }

        this.processStartTime = new Date().getTime();
    }

    private async ingest({ data, timestamp }): Promise<void> {
        if (this.dataApiIngest) {
            await this.dbIngest({
                data,
                timestamp,
            });
        } else {
            this.localIngest({
                data,
                timestamp,
            });
        }
    }

    private localIngest({ data, timestamp }) {
        let ingestRecords = this.elrondDataService.objectToIngestRecords({
            data,
            timestamp,
        });

        for (const ingestRecord of ingestRecords) {
            const filePath = `${
                this.localIngestFolder
            }/${this.getLocalIngestFileName(ingestRecord.timestamp)}`;

            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, '');
            }

            fs.appendFileSync(filePath, `${JSON.stringify(ingestRecord)}\r\n`);
            this.ingestedCnt++;
        }
    }

    private async dbIngest({ data, timestamp }): Promise<void> {
        const newRecordsToIngest = this.elrondDataService.objectToIngestRecords(
            {
                data,
                timestamp,
            },
        );
        this.ingestRecordsBuffer =
            this.ingestRecordsBuffer.concat(newRecordsToIngest);
        this.ingestedCnt += newRecordsToIngest.length;

        await this.waitForOldIngestRequestsIfNeeded();

        if (this.ingestRecordsBuffer.length > this.ingestRecordsThreshold) {
            const promise = this.elrondDataService
                .ingest(this.ingestRecordsBuffer)
                .then((res) => {
                    this.ingestRecordsPromises =
                        this.ingestRecordsPromises.slice(1);
                    return res;
                });
            this.ingestRecordsPromises.push(promise);
            this.ingestRecordsBuffer = [];
        }
    }

    private async ingestLastRecords(): Promise<void> {
        if (this.dataApiIngest) {
            const promise = this.elrondDataService.ingest(
                this.ingestRecordsBuffer,
            );
        }
    }

    private async waitForOldIngestRequestsIfNeeded(): Promise<void> {
        if (this.ingestRecordsPromises.length > this.ingestPromisesThreshold) {
            await Promise.all(this.ingestRecordsPromises);
            this.ingestRecordsPromises = [];
        }
    }

    private async handleOldLiqudityEvent(
        event: AddLiquidityEvent | RemoveLiquidityEvent,
    ): Promise<void> {
        try {
            await this.updatePairStateForLiquidityEvent(event);

            const [
                firstTokenLockedValueUSD,
                secondTokenLockedValueUSD,
                pairLockedValueUSD,
                newTotalLockedValueUSD,
            ] = await Promise.all([
                this.computeFirstTokenLockedValueUSD(event.address),
                this.computeSecondTokenLockedValueUSD(event.address),
                this.computeLockedValueUSD(event.address),
                this.computeTotalLockedValueUSD(),
            ]);

            const data = {};
            data['factory'] = {
                totalLockedValueUSD: newTotalLockedValueUSD.toFixed(),
            };
            data[event.address] = {
                firstTokenLocked: event.getFirstTokenReserves(),
                firstTokenLockedValueUSD: firstTokenLockedValueUSD,
                secondTokenLocked: event.getSecondTokenReserves(),
                secondTokenLockedValueUSD: secondTokenLockedValueUSD,
                lockedValueUSD: pairLockedValueUSD,
                liquidity: event.getLiquidityPoolSupply(),
            };
            data[event.getFirstToken().tokenID] =
                await this.getTokenLiquidityData(event.getFirstToken().tokenID);
            data[event.getSecondToken().tokenID] =
                await this.getTokenLiquidityData(
                    event.getSecondToken().tokenID,
                );

            await this.ingest({
                data,
                timestamp: event.getTimestamp().toNumber(),
            });
        } catch (error) {
            //this.saveLogData(`Bad event ${event} ${error}`);
            throw error;
        }
    }

    private async handleOldSwapEvents(
        event: SwapFixedInputEvent | SwapFixedOutputEvent,
    ): Promise<void> {
        try {
            await this.updatePairStateForSwapEvent(event);

            const [
                firstTokenID,
                secondTokenID,
                tokenIn,
                tokenOut,
                tokenInPriceUSD,
                tokenOutPriceUSD,
                firstTokenLockedValueUSD,
                secondTokenLockedValueUSD,
                liquidityPoolSupply,
                totalFeePercent,
                newTotalLockedValueUSD,
            ] = await Promise.all([
                this.pairGetterService.getFirstTokenID(event.address),
                this.pairGetterService.getSecondTokenID(event.address),
                this.tokenGetterService.getTokenMetadata(
                    event.getTokenIn().tokenID,
                ),
                this.tokenGetterService.getTokenMetadata(
                    event.getTokenOut().tokenID,
                ),
                this.computeTokenPriceUSD(event.getTokenIn().tokenID),
                this.computeTokenPriceUSD(event.getTokenOut().tokenID),
                this.computeFirstTokenLockedValueUSD(event.address),
                this.computeSecondTokenLockedValueUSD(event.address),
                this.state.pairsState[event.address]['liquidityPoolSupply'],
                this.pairGetterService.getTotalFeePercent(event.address),
                this.computeTotalLockedValueUSD(),
            ]);

            const [firstTokenPrice, secondTokenPrice] = await Promise.all([
                this.computeFirstTokenPrice(event.address),
                this.computeSecondTokenPrice(event.address),
            ]);

            const [tokenInAmountDenom, tokenOutAmountDenom] = [
                denominateAmount(
                    event.getTokenIn().amount.toString(),
                    tokenIn.decimals,
                ),
                denominateAmount(
                    event.getTokenOut().amount.toString(),
                    tokenOut.decimals,
                ),
            ];

            const [tokenInAmountUSD, tokenOutAmountUSD] = [
                tokenInAmountDenom.times(tokenInPriceUSD),
                tokenOutAmountDenom.times(tokenOutPriceUSD),
            ];

            const pairLockedValueUSD = new BigNumber(firstTokenLockedValueUSD)
                .plus(secondTokenLockedValueUSD)
                .toFixed();
            const volumeUSD = tokenInAmountUSD
                .plus(tokenOutAmountUSD)
                .dividedBy(2);
            const feesUSD = tokenInAmountUSD.times(totalFeePercent);

            const data = {};
            data[event.address] = {
                firstTokenPrice: firstTokenPrice,
                firstTokenLocked:
                    event.getTokenIn().tokenID === firstTokenID
                        ? event.tokenInReserves
                        : event.tokenOutReserves,
                firstTokenLockedValueUSD: firstTokenLockedValueUSD,
                secondTokenPrice: secondTokenPrice,
                secondTokenLocked:
                    event.getTokenOut().tokenID === secondTokenID
                        ? event.tokenOutReserves
                        : event.tokenInReserves,
                secondTokenLockedValueUSD: secondTokenLockedValueUSD,
                firstTokenVolume:
                    firstTokenID === tokenIn.identifier
                        ? event.getTokenIn().amount
                        : event.getTokenOut().amount,
                secondTokenVolume:
                    secondTokenID === tokenOut.identifier
                        ? event.getTokenOut().amount
                        : event.getTokenIn().amount,
                lockedValueUSD: pairLockedValueUSD,
                liquidity: liquidityPoolSupply,
                volumeUSD: volumeUSD,
                feesUSD: feesUSD,
            };

            data[event.getTokenIn().tokenID] = await this.getTokenSwapData(
                event.getTokenIn().tokenID,
                event['tokenIn']['amount'],
            );
            data[event.getTokenOut().tokenID] = await this.getTokenSwapData(
                event.getTokenOut().tokenID,
                event.getTokenOut().amount.toString(),
            );

            data['factory'] = {
                totalLockedValueUSD: newTotalLockedValueUSD.toFixed(),
            };

            await this.ingest({
                data,
                timestamp: event.getTimestamp().toNumber(),
            });
        } catch (error) {
            //this.saveLogData(`Bad event ${event} ${error}`);
            throw error;
        }
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

    private async computeFirstTokenLockedValueUSD(
        pairAddress: string,
    ): Promise<BigNumber> {
        try {
            const [firstToken, firstTokenPriceUSD, firstTokenReserve] =
                await Promise.all([
                    this.pairGetterService.getFirstToken(pairAddress),
                    this.computeFirstTokenPriceUSD(pairAddress),
                    this.getFirstTokenReserve(pairAddress),
                ]);

            return new BigNumber(firstTokenReserve)
                .multipliedBy(`1e-${firstToken.decimals}`)
                .multipliedBy(firstTokenPriceUSD);
        } catch (error) {
            this.saveLogData(
                `error computeFirstTokenLockedValueUSD ${pairAddress} ${error}`,
            );
            return new BigNumber(0);
        }
    }

    private async computeSecondTokenLockedValueUSD(
        pairAddress: string,
    ): Promise<BigNumber> {
        try {
            const [secondToken, secondTokenPriceUSD, secondTokenReserve] =
                await Promise.all([
                    this.pairGetterService.getSecondToken(pairAddress),
                    this.computeSecondTokenPriceUSD(pairAddress),
                    this.getSecondTokenReserve(pairAddress),
                ]);
            return new BigNumber(secondTokenReserve)
                .multipliedBy(`1e-${secondToken.decimals}`)
                .multipliedBy(secondTokenPriceUSD);
        } catch (error) {
            this.saveLogData(
                `error computeSecondTokenLockedValueUSD ${pairAddress} ${error}`,
            );
            return new BigNumber(0);
        }
    }

    private async getFirstTokenReserve(
        pairAddress: string,
    ): Promise<BigNumber> {
        return new BigNumber(
            this.state.pairsState?.[pairAddress]['firstTokenReserves'],
        );
    }

    private async getSecondTokenReserve(
        pairAddress: string,
    ): Promise<BigNumber> {
        try {
            return new BigNumber(
                this.state.pairsState[pairAddress]['secondTokenReserves'],
            );
        } catch (error) {
            this.saveLogData(`error getSecondTokenReserve ${error}`);
            throw error;
        }
    }

    private async computeFirstTokenPriceUSD(pairAddress): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
        ]);

        if (firstTokenID === constantsConfig.USDC_TOKEN_ID) {
            return new BigNumber(1).toFixed();
        }

        if (secondTokenID === constantsConfig.USDC_TOKEN_ID) {
            return await this.computeFirstTokenPrice(pairAddress);
        }

        const tokenPriceUSD = await this.computeTokenPriceUSD(firstTokenID);
        return tokenPriceUSD.toFixed();
    }

    private async computeSecondTokenPriceUSD(pairAddress): Promise<string> {
        try {
            const [firstTokenID, secondTokenID] = await Promise.all([
                this.pairGetterService.getFirstTokenID(pairAddress),
                this.pairGetterService.getSecondTokenID(pairAddress),
            ]);

            if (secondTokenID === constantsConfig.USDC_TOKEN_ID) {
                return new BigNumber(1).toFixed();
            }

            if (firstTokenID === constantsConfig.USDC_TOKEN_ID) {
                return await this.computeSecondTokenPrice(pairAddress);
            }

            const tokenPriceUSD = await this.computeTokenPriceUSD(
                secondTokenID,
            );
            return tokenPriceUSD.toFixed();
        } catch (error) {
            this.saveLogData(
                `error computeSecondTokenPriceUSD ${pairAddress} ${error}`,
            );
            return '0';
        }
    }

    private async computeTokenPriceUSD(tokenID: string): Promise<BigNumber> {
        return constantsConfig.USDC_TOKEN_ID === tokenID
            ? new BigNumber(1)
            : //await this.getPriceUSDByPath(tokenID);
              new BigNumber(await this.computeTokenPriceDerivedUSD(tokenID));
    }

    private async computeFirstTokenPrice(pairAddress: string): Promise<string> {
        const [firstToken, secondToken] = await Promise.all([
            this.pairGetterService.getFirstToken(pairAddress),
            this.pairGetterService.getSecondToken(pairAddress),
        ]);

        const firstTokenPrice = await this.getEquivalentForLiquidity(
            pairAddress,
            firstToken.identifier,
            new BigNumber(`1e${firstToken.decimals}`).toFixed(),
        );

        return new BigNumber(firstTokenPrice)
            .multipliedBy(`1e-${secondToken.decimals}`)
            .toFixed();
    }

    private async computeSecondTokenPrice(
        pairAddress: string,
    ): Promise<string> {
        const [firstToken, secondToken] = await Promise.all([
            this.pairGetterService.getFirstToken(pairAddress),
            this.pairGetterService.getSecondToken(pairAddress),
        ]);

        const secondTokenPrice = await this.getEquivalentForLiquidity(
            pairAddress,
            secondToken.identifier,
            new BigNumber(`1e${firstToken.decimals}`).toFixed(),
        );

        return new BigNumber(secondTokenPrice)
            .multipliedBy(`1e-${firstToken.decimals}`)
            .toFixed();
    }

    private async getEquivalentForLiquidity(
        pairAddress: string,
        tokenInID: string,
        amount: string,
    ): Promise<string> {
        const [wrappedTokenID, firstTokenID, secondTokenID, pairInfo] =
            await Promise.all([
                this.wegldID,
                this.pairGetterService.getFirstTokenID(pairAddress),
                this.pairGetterService.getSecondTokenID(pairAddress),
                this.getPairInfoMetadata(pairAddress),
            ]);

        const tokenIn =
            tokenInID === elrondConfig.EGLDIdentifier
                ? wrappedTokenID
                : tokenInID;

        if (!pairInfo) {
            return new BigNumber(0).toFixed();
        }

        switch (tokenIn) {
            case firstTokenID:
                return quote(
                    amount,
                    pairInfo.reserves0,
                    pairInfo.reserves1,
                ).toFixed();
            case secondTokenID:
                return quote(
                    amount,
                    pairInfo.reserves1,
                    pairInfo.reserves0,
                ).toFixed();
            default:
                return new BigNumber(0).toFixed();
        }
    }

    private async getPairInfoMetadata(
        pairAddress: string,
    ): Promise<PairInfoModel> {
        if (this.state.pairsState[pairAddress]) {
            return new PairInfoModel({
                reserves0:
                    this.state.pairsState[pairAddress]['firstTokenReserves'],
                reserves1:
                    this.state.pairsState[pairAddress]['secondTokenReserves'],
                totalSupply:
                    this.state.pairsState[pairAddress]['liquidityPoolSupply'],
            });
        }
        this.saveLogData(
            `no pair info metadata from getPairInfoMetadata yet ${pairAddress}`,
        );
        return undefined;
    }

    private async computeLockedValueUSD(
        pairAddress: string,
    ): Promise<BigNumber> {
        const [firstTokenLockedValueUSD, secondTokenLockedValueUSD] =
            await Promise.all([
                this.computeFirstTokenLockedValueUSD(pairAddress),
                this.computeSecondTokenLockedValueUSD(pairAddress),
            ]);

        return new BigNumber(firstTokenLockedValueUSD).plus(
            secondTokenLockedValueUSD,
        );
    }

    private getAllPairAddresses(): string[] {
        let pairAddresses = [];
        for (var pairAddress in this.state.pairsState) {
            pairAddresses.push(pairAddress);
        }
        return pairAddresses;
    }

    private async computeTotalLockedValueUSD(): Promise<BigNumber> {
        try {
            const pairaddresses = this.getAllPairAddresses();

            let totalValueLockedUSD = new BigNumber(0);
            const promises = pairaddresses.map((pairAddress) =>
                this.computeLockedValueUSD(pairAddress),
            );

            const pairsLockedValueUSD = await Promise.all(promises);

            for (const lockedValueUSD of pairsLockedValueUSD) {
                const lockedValueUSDBig = new BigNumber(lockedValueUSD);
                totalValueLockedUSD = !lockedValueUSDBig.isNaN()
                    ? totalValueLockedUSD.plus(lockedValueUSD)
                    : totalValueLockedUSD;
            }

            return totalValueLockedUSD;
        } catch (error) {
            this.saveLogData(`error computeTotalLockedValueUSD ${error}`);
            throw error;
        }
    }

    private async getTokenLiquidityData(tokenID: string): Promise<any> {
        const pairaddresses = this.getAllPairAddresses();

        const [token, priceUSD] = await Promise.all([
            this.tokenGetterService.getTokenMetadata(tokenID),
            this.computeTokenPriceUSD(tokenID),
        ]);

        let newLockedValue = new BigNumber(0);

        for (const pair of pairaddresses) {
            let lockedValue = '0';
            switch (tokenID) {
                case this.state.pairsState[pair].firstTokenID:
                    lockedValue =
                        this.state.pairsState[pair].firstTokenReserves;
                    break;
                case this.state.pairsState[pair].secondTokenID:
                    lockedValue =
                        this.state.pairsState[pair].secondTokenReserves;
                    break;
            }
            newLockedValue = newLockedValue.plus(lockedValue);
        }
        const lockedValueDenom = denominateAmount(
            newLockedValue.toFixed(),
            token.decimals,
        );
        return {
            lockedValue: newLockedValue.toFixed(),
            lockedValueUSD: lockedValueDenom.times(priceUSD).toFixed(),
        };
    }

    private async getTokenSwapData(
        tokenID: string,
        amount: string,
    ): Promise<any> {
        const [token, priceUSD, lockedData] = await Promise.all([
            this.tokenGetterService.getTokenMetadata(tokenID),
            this.computeTokenPriceUSD(tokenID),
            this.getTokenLiquidityData(tokenID),
        ]);
        return {
            lockedValue: lockedData.lockedValue,
            lockedValueUSD: lockedData.lockedValueUSD,
            priceUSD: priceUSD,
            volume: amount,
            volumeUSD: denominateAmount(amount, token.decimals)
                .times(priceUSD)
                .toFixed(),
        };
    }

    private async getPriceUSDByPath(tokenID: string): Promise<BigNumber> {
        const pair = await this.getPairByTokens(
            tokenID,
            constantsConfig.USDC_TOKEN_ID,
        );
        if (pair) {
            let tokenPriceUSD: string;
            switch (tokenID) {
                case pair.firstTokenID:
                    tokenPriceUSD = await this.computeFirstTokenPriceUSD(
                        pair.address,
                    );
                    break;
                case pair.secondTokenID:
                    tokenPriceUSD = await this.computeSecondTokenPriceUSD(
                        pair.address,
                    );
                    break;
            }
            return new BigNumber(tokenPriceUSD);
        }

        const path: string[] = [];
        const discovered = new Map<string, boolean>();
        let graph = this.pairsMap;
        if (!graph.has(tokenID)) {
            this.saveLogData(`graph does not contain ${tokenID}`);
            await this.refreshPairsMap();
            graph = this.pairsMap;
            return new BigNumber(0);
        }

        const pathTokenProviderUSD = graph
            .get(tokenID)
            .find((entry) => entry === this.wegldID);

        if (pathTokenProviderUSD !== undefined) {
            return await this.getPriceUSDByToken(tokenID, this.wegldID);
        }

        for (const edge of graph.keys()) {
            discovered.set(edge, false);
        }
        this.isConnected(graph, tokenID, this.wegldID, discovered, path);

        if (path.length === 0) {
            return new BigNumber(0);
        }

        for (let i = 1; i < path.length; i++) {
            const price = await this.getPriceUSDByToken(tokenID, path[i]);
            if (price !== new BigNumber(0)) {
                return price;
            }
        }
        this.saveLogData(`Can't getPriceUSDByPath ${tokenID}`);
        return new BigNumber(0);
    }

    private async getPriceUSDByToken(
        tokenID: string,
        priceProviderToken: string,
    ): Promise<BigNumber> {
        const pair = await this.getPairByTokens(tokenID, priceProviderToken);
        const firstTokenPrice = await this.getTokenPrice(pair.address, tokenID);
        const priceProviderUSD = await this.computeTokenPriceUSD(
            priceProviderToken,
        );

        return new BigNumber(priceProviderUSD).multipliedBy(firstTokenPrice);
    }

    private async getTokenPrice(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        try {
            const [firstTokenID, secondTokenID] = await Promise.all([
                this.state.pairsState[pairAddress].firstTokenID,
                this.state.pairsState[pairAddress].secondTokenID,
            ]);

            switch (tokenID) {
                case firstTokenID:
                    return await this.computeFirstTokenPrice(pairAddress);
                case secondTokenID:
                    return await this.computeFirstTokenPrice(pairAddress);
            }
        } catch (error) {
            throw error;
        }
    }

    private async handleOldPriceDiscoveryEvent(
        event: DepositEvent | WithdrawEvent,
    ): Promise<void> {
        const [launchedTokenPrice, acceptedTokenPrice] = await Promise.all([
            this.computeLaunchedTokenPrice(
                event.token.tokenID,
                event.redeemToken.tokenID,
                event.acceptedTokenAmount.toString(),
                event.launchedTokenAmount.toString(),
            ),
            this.computeAcceptedTokenPrice(
                event.token.tokenID,
                event.redeemToken.tokenID,
                event.acceptedTokenAmount.toString(),
                event.launchedTokenAmount.toString(),
            ),
        ]);

        const acceptedTokenPriceUSD = await this.computeTokenPriceUSD(
            event.token.tokenID,
        );

        const launchedTokenPriceUSD = await this.computeLaunchedTokenPriceUSD(
            acceptedTokenPriceUSD,
            launchedTokenPrice,
        );

        const data = {
            [event.address]: {
                launchedTokenAmount: event.launchedTokenAmount.toString(),
                acceptedTokenAmount: event.acceptedTokenAmount.toString(),
                launchedTokenPrice: launchedTokenPrice,
                acceptedTokenPrice: acceptedTokenPrice,
                launchedTokenPriceUSD: launchedTokenPriceUSD,
            },
        };

        await this.ingest({
            data,
            timestamp: Number(event.getTopics()['timestamp']),
        });
    }

    private async computeAcceptedTokenPrice(
        acceptedTokenID: string,
        launchedTokenID: string,
        acceptedTokenAmount: string,
        launchedTokenAmount: string,
    ): Promise<string> {
        const [launchedTokenDecimals, acceptedToken] = await Promise.all([
            this.getCollectionDecimals(launchedTokenID),
            this.tokenGetterService.getTokenMetadata(acceptedTokenID),
        ]);

        const acceptedTokenPrice = quote(
            new BigNumber(`1e${acceptedToken.decimals}`).toFixed(),
            acceptedTokenAmount,
            launchedTokenAmount,
        );

        return new BigNumber(acceptedTokenPrice)
            .multipliedBy(`1e-${launchedTokenDecimals}`)
            .toFixed();
    }

    private async computeLaunchedTokenPrice(
        acceptedTokenID: string,
        launchedTokenID: string,
        acceptedTokenAmount: string,
        launchedTokenAmount: string,
    ): Promise<string> {
        const [launchedTokenDecimals, acceptedToken] = await Promise.all([
            this.getCollectionDecimals(launchedTokenID),
            this.tokenGetterService.getTokenMetadata(acceptedTokenID),
        ]);

        const launchedTokenPrice = quote(
            new BigNumber(`1e${launchedTokenDecimals}`).toFixed(),
            launchedTokenAmount,
            acceptedTokenAmount,
        );

        return new BigNumber(launchedTokenPrice)
            .multipliedBy(`1e-${acceptedToken.decimals}`)
            .toFixed();
    }

    private async computeLaunchedTokenPriceUSD(
        acceptedTokenPriceUSD: BigNumber,
        launchedTokenPrice: string,
    ): Promise<string> {
        return new BigNumber(launchedTokenPrice)
            .multipliedBy(acceptedTokenPriceUSD)
            .toFixed();
    }

    private async getCollectionDecimals(identifier: string): Promise<number> {
        if (this.launchedTokensDecimals[identifier]) {
            return this.launchedTokensDecimals[identifier];
        }
        const collection: NftCollection =
            await this.elrondApiService.getNftCollection(
                identifier,
                'extract=decimals',
            );
        this.launchedTokensDecimals[identifier] = collection.decimals;
        return collection.decimals;
    }

    private async getAllPairsMetadata(): Promise<PairMetadata[]> {
        let pairsMetadata: PairMetadata[] =
            await this.routerGetterService.getPairsMetadata();
        try {
            Object.keys(this.state.pairsState).forEach((pairAddress) => {
                if (
                    pairsMetadata.find((p) => p.address === pairAddress) ===
                    undefined
                ) {
                    pairsMetadata.push(
                        new PairMetadata({
                            address: pairAddress,
                            firstTokenID:
                                this.state.pairsState[pairAddress].firstTokenID,
                            secondTokenID:
                                this.state.pairsState[pairAddress]
                                    .secondTokenID,
                        }),
                    );
                }
            });
        } catch (error) {
            this.saveLogData(
                `Error when trying to getAllPairsMetadata ${error}`,
            );
            throw error;
        }
        return pairsMetadata;
    }

    private async getPairByTokens(
        token1ID: string,
        token2ID: string,
    ): Promise<PairMetadata> {
        const pairs = await this.getAllPairsMetadata();
        return pairs.find(
            (p) =>
                (p.firstTokenID === token1ID && p.secondTokenID === token2ID) ||
                (p.firstTokenID === token2ID && p.secondTokenID === token1ID),
        );
    }

    isConnected(
        graph: Map<string, string[]>,
        input: string,
        output: string,
        discovered: Map<string, boolean>,
        path: string[] = [],
    ): boolean {
        discovered.set(input, true);
        path.push(input);

        if (input === output) {
            return true;
        }

        for (const vertex of graph.get(input)) {
            if (!discovered.get(vertex)) {
                if (this.isConnected(graph, vertex, output, discovered, path)) {
                    return true;
                }
            }
        }

        path.pop();
        return false;
    }

    async computeTokenPriceDerivedEGLD(tokenID: string): Promise<string> {
        if (tokenID === tokenProviderUSD) {
            return new BigNumber('1').toFixed();
        }

        const pairsMetadata = await this.getAllPairsMetadata();
        const tokenPairs: PairMetadata[] = [];
        for (const pair of pairsMetadata) {
            if (
                pair.firstTokenID === tokenID ||
                pair.secondTokenID === tokenID
            ) {
                tokenPairs.push(pair);
            }
        }

        let largestLiquidityEGLD = new BigNumber(0);
        let priceSoFar = '0';

        if (tokenID === constantsConfig.USDC_TOKEN_ID) {
            const eglpPriceUSD = await this.getEgldPriceInUSD();
            priceSoFar = new BigNumber(1).dividedBy(eglpPriceUSD).toFixed();
        } else {
            for (const pair of tokenPairs) {
                const liquidity = await this.state.pairsState[pair.address]
                    .liquidityPoolSupply;

                if (new BigNumber(liquidity).isGreaterThan(0)) {
                    if (pair.firstTokenID === tokenID) {
                        const [
                            secondTokenDerivedEGLD,
                            secondTokenReserves,
                            firstTokenPrice,
                        ] = await Promise.all([
                            this.computeTokenPriceDerivedEGLD(
                                pair.secondTokenID,
                            ),
                            this.state.pairsState[pair.address]
                                .secondTokenReserves,
                            this.computeFirstTokenPrice(pair.address), //usd or not?
                        ]);
                        const egldLocked = new BigNumber(
                            secondTokenReserves,
                        ).times(secondTokenDerivedEGLD);
                        if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                            largestLiquidityEGLD = egldLocked;
                            priceSoFar = new BigNumber(firstTokenPrice)
                                .times(secondTokenDerivedEGLD)
                                .toFixed();
                        }
                    }
                    if (pair.secondTokenID === tokenID) {
                        const [
                            firstTokenDerivedEGLD,
                            firstTokenReserves,
                            secondTokenPrice,
                        ] = await Promise.all([
                            this.computeTokenPriceDerivedEGLD(
                                pair.firstTokenID,
                            ),
                            this.state.pairsState[pair.address]
                                .firstTokenReserves,
                            this.computeSecondTokenPrice(pair.address), //usd or not?
                        ]);
                        const egldLocked = new BigNumber(
                            firstTokenReserves,
                        ).times(firstTokenDerivedEGLD);
                        if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                            largestLiquidityEGLD = egldLocked;
                            priceSoFar = new BigNumber(secondTokenPrice)
                                .times(firstTokenDerivedEGLD)
                                .toFixed();
                        }
                    }
                }
            }
        }
        return priceSoFar;
    }

    async computeTokenPriceDerivedUSD(tokenID: string): Promise<string> {
        const [egldPriceUSD, derivedEGLD] = await Promise.all([
            this.getEgldPriceInUSD(),
            this.computeTokenPriceDerivedEGLD(tokenID),
        ]);

        return new BigNumber(derivedEGLD).times(egldPriceUSD).toFixed();
    }

    async getEgldPriceInUSD(): Promise<string> {
        return (await this.getPriceUSDByPath(this.wegldID)).toString();
    }
}
