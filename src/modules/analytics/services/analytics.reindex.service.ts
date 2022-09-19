import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
    nowUtc,
    oneDay,
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
import * as fs from 'fs';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';

@Injectable()
export class AnalyticsReindexService {
    private readonly wegldID = tokenProviderUSD;
    private pairsState: any = undefined;
    private pairsMap: any = undefined;
    private launchedTokensDecimals: any = [];

    private debug = true;
    private stateFileName = 'pairsState.json';
    private logsFileName = 'logs.txt';

    // PS:
    // in events, 'totalFeePercent' was not saved => getTotalFeePercent
    // in events, the state (active or not) of a pair was not saved => can affect getPriceUSDByPath()

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
        const startDateUtc = elrondData.indexingStartTimeUtc;
        const endDateUtc = nowUtc();

        const batchRangeInSeconds = oneDay();
        const dateIntervals = splitDateRangeIntoIntervalsUtc(
            startDateUtc,
            endDateUtc,
            batchRangeInSeconds,
        );

        if (this.debug) console.log('dateIntervals', dateIntervals);

        await this.initReindexState();

        for (let i = 0; i < dateIntervals.length - 1; i++) {
            const lte = new Date(dateIntervals[i]).getTime() / 1000;
            const gte = new Date(dateIntervals[i + 1]).getTime() / 1000;

            if (this.debug)
                console.log(`processing interval gte ${lte} <-> lte ${gte}`);

            const eventNames = [
                PAIR_EVENTS.ADD_LIQUIDITY,
                PAIR_EVENTS.REMOVE_LIQUIDITY,
                PAIR_EVENTS.SWAP_FIXED_INPUT,
                PAIR_EVENTS.SWAP_FIXED_OUTPUT,
                PRICE_DISCOVERY_EVENTS.DEPOSIT,
                PRICE_DISCOVERY_EVENTS.WITHDARW,
            ];
            const eventGroups = await this.getEventsOrderedByTimestamp(
                gte,
                lte,
                eventNames,
            );

            await this.processEvents(eventGroups);

            if (this.debug)
                console.log(`the end for interval gte ${lte} <-> lte ${gte}`);

            this.savePairsState();
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        return true;
    }

    private async getEventsOrderedByTimestamp(
        gte: number,
        lte: number,
        eventNames: string[],
    ): Promise<any> {
        const eventPromises: Promise<any>[] = [];

        for (const eventName of eventNames) {
            eventPromises.push(this.getTransactionsLogs(eventName, gte, lte));
        }

        let eventGroupBatches = await Promise.all(eventPromises);

        let eventGroups = [];
        for (const group of eventGroupBatches) {
            eventGroups = eventGroups.concat(group);
        }

        eventGroups.sort(function(a, b) {
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
                switch (rawEvent.identifier) {
                    case PAIR_EVENTS.SWAP_FIXED_INPUT: {
                        let event: SwapFixedInputEvent;
                        this.logRawEventId(rawEvent);
                        try {
                            event = new SwapFixedInputEvent(rawEvent);
                        } catch (error) {
                            this.saveLogData(rawEvent);
                        }
                        if (event) {
                            await this.handleOldSwapEvents(event);
                        }
                        break;
                    }
                    case PAIR_EVENTS.SWAP_FIXED_OUTPUT: {
                        let event: SwapFixedOutputEvent;
                        this.logRawEventId(rawEvent);
                        try {
                            event = new SwapFixedOutputEvent(rawEvent);
                        } catch (error) {
                            this.saveLogData(rawEvent);
                        }
                        if (event) {
                            await this.handleOldSwapEvents(event);
                        }
                        break;
                    }
                    case PAIR_EVENTS.ADD_LIQUIDITY: {
                        let event: AddLiquidityEvent;
                        this.logRawEventId(rawEvent);
                        try {
                            event = new AddLiquidityEvent(rawEvent);
                        } catch (error) {
                            this.saveLogData(rawEvent);
                        }
                        if (event) {
                            await this.handleOldLiqudityEvent(event);
                        }
                        break;
                    }
                    case PAIR_EVENTS.REMOVE_LIQUIDITY: {
                        let event: RemoveLiquidityEvent;
                        this.logRawEventId(rawEvent);
                        try {
                            event = new RemoveLiquidityEvent(rawEvent);
                        } catch (error) {
                            this.saveLogData(rawEvent);
                        }
                        if (event) {
                            await this.handleOldLiqudityEvent(event);
                        }
                        break;
                    }
                    case PRICE_DISCOVERY_EVENTS.DEPOSIT: {
                        let event: DepositEvent;
                        this.logRawEventId(rawEvent);
                        try {
                            event = new DepositEvent(rawEvent);
                        } catch (error) {
                            this.saveLogData(rawEvent);
                        }
                        if (event) {
                            await this.processPriceDiscoveryEvent(event);
                        }
                        break;
                    }
                    case PRICE_DISCOVERY_EVENTS.WITHDARW: {
                        let event: WithdrawEvent;
                        this.logRawEventId(rawEvent);
                        try {
                            event = new WithdrawEvent(rawEvent);
                        } catch (error) {
                            this.saveLogData(rawEvent);
                        }
                        if (event) {
                            await this.processPriceDiscoveryEvent(event);
                        }
                        break;
                    }
                }
            }
        }
    }

    private logRawEventId(rawEvent: any): void {
        if (this.debug) console.log('rawEvent.identifier', rawEvent.identifier);
    }

    private async initReindexState(): Promise<void> {
        await this.initPairsState();
        await this.updatePairsMap();
    }

    private async initPairsState(): Promise<void> {
        if (this.pairsState === undefined) {
            try {
                const pairsStateData = fs.readFileSync(this.stateFileName);
                this.pairsState = JSON.parse(pairsStateData.toString());
            } catch (error) {
                this.pairsState = {};
            }

            try {
                let pairsMetadata: PairMetadata[] = await this.routerGetterService.getPairsMetadata();
                for (const pair of pairsMetadata) {
                    if (this.pairsState[pair.address]) {
                        continue;
                    }

                    this.pairsState[pair.address] = {
                        firstTokenID: pair.firstTokenID,
                        secondTokenID: pair.secondTokenID,
                        firstTokenReserves: 0,
                        secondTokenReserves: 0,
                        liquidityPoolSupply: 0,
                    };
                }
            } catch (error) {
                console.log(
                    'Error when trying to add all existing pairs to the local pairs',
                );
                throw error;
            }
        }
    }

    private async updatePairsMap(): Promise<void> {
        this.pairsMap = await this.getPairsMap(true);
        if (this.debug) {
            console.log('new pair map', this.pairsMap);
        }
    }

    private async updatePairsState(
        pairAddress: string,
        pairData: any,
    ): Promise<void> {
        if (this.pairsState[pairAddress] === undefined) {
            await this.updatePairsMap();
        } else if (this.pairsState[pairAddress] === null) {
            throw new Error('wtf4');
        }

        this.pairsState[pairAddress] = pairData;
    }

    private savePairsState(): void {
        fs.writeFileSync(
            this.stateFileName,
            JSON.stringify(this.pairsState),
            null,
        );
    }

    private async updatePairsStateForLiquidityEvent(
        event: AddLiquidityEvent | RemoveLiquidityEvent,
    ): Promise<void> {
        await this.updatePairsState(event.address, {
            firstTokenID: event.getFirstToken().tokenID,
            secondTokenID: event.getSecondToken().tokenID,
            firstTokenReserves: event.getFirstTokenReserves(),
            secondTokenReserves: event.getSecondTokenReserves(),
            liquidityPoolSupply: event.getLiquidityPoolSupply(),
        });
    }

    private async updatePairsStateForSwapEvent(
        event: SwapFixedInputEvent | SwapFixedOutputEvent,
    ): Promise<void> {
        if (!this.pairsState[event.address]) {
            const firstTokenID = await this.pairGetterService.getFirstTokenID(
                event.address,
            );
            this.pairsState[event.address] = {
                firstTokenID: firstTokenID,
                liquidityPoolSupply: 0,
            };
        }

        if (
            this.pairsState[event.address].firstTokenID ===
            event.getTokenIn().tokenID
        ) {
            await this.updatePairsState(event.address, {
                firstTokenID: event.getTokenIn().tokenID,
                secondTokenID: event.getTokenOut().tokenID,
                firstTokenReserves: event.getTokenInReserves().toString(),
                secondTokenReserves: event.getTokenOutReserves().toString(),
                liquidityPoolSupply:
                    this.pairsState[event.address]?.liquidityPoolSupply ?? '0',
            });
        } else {
            await this.updatePairsState(event.address, {
                firstTokenID: event.getTokenOut().tokenID,
                secondTokenID: event.getTokenIn().tokenID,
                firstTokenReserves: event.getTokenOutReserves().toString(),
                secondTokenReserves: event.getTokenInReserves().toString(),
                liquidityPoolSupply:
                    this.pairsState[event.address]?.liquidityPoolSupply ?? '0',
            });
        }
    }

    private saveLogData(logData: any): void {
        fs.appendFileSync(
            this.logsFileName,
            JSON.stringify(logData) + '\r\n',
            null,
        );
    }

    private async handleOldLiqudityEvent(
        event: AddLiquidityEvent | RemoveLiquidityEvent,
    ): Promise<void> {
        try {
            await this.updatePairsStateForLiquidityEvent(event);

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
            data[
                event.getFirstToken().tokenID
            ] = await this.getTokenLiquidityData(event.getFirstToken().tokenID);
            data[
                event.getSecondToken().tokenID
            ] = await this.getTokenLiquidityData(
                event.getSecondToken().tokenID,
            );

            await Promise.all([
                this.elrondDataService.ingestObject(
                    elrondData.timescale.table,
                    data,
                    event.getTimestamp().toNumber(),
                ),
            ]);
        } catch (error) {
            console.error(error);
            this.saveLogData(event);
            throw error;
        }
    }

    private async handleOldSwapEvents(
        event: SwapFixedInputEvent | SwapFixedOutputEvent,
    ): Promise<void> {
        try {
            await this.updatePairsStateForSwapEvent(event);

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
                this.pairsState[event.address]['liquidityPoolSupply'],
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

            await Promise.all([
                this.elrondDataService.ingestObject(
                    elrondData.timescale.table,
                    data,
                    event.getTimestamp().toNumber(),
                ),
            ]);
        } catch (error) {
            console.error(error);
            this.saveLogData(event);
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
            const [
                firstToken,
                firstTokenPriceUSD,
                firstTokenReserve,
            ] = await Promise.all([
                this.pairGetterService.getFirstToken(pairAddress),
                this.computeFirstTokenPriceUSD(pairAddress),
                this.getFirstTokenReserve(pairAddress),
            ]);
            return new BigNumber(firstTokenReserve)
                .multipliedBy(`1e-${firstToken.decimals}`)
                .multipliedBy(firstTokenPriceUSD);
        } catch (error) {
            if (this.debug)
                console.log(
                    'error computeFirstTokenLockedValueUSD',
                    pairAddress,
                );
            return new BigNumber(0);
        }
    }

    private async computeSecondTokenLockedValueUSD(
        pairAddress: string,
    ): Promise<BigNumber> {
        try {
            const [
                secondToken,
                secondTokenPriceUSD,
                secondTokenReserve,
            ] = await Promise.all([
                this.pairGetterService.getSecondToken(pairAddress),
                this.computeSecondTokenPriceUSD(pairAddress),
                this.getSecondTokenReserve(pairAddress),
            ]);
            return new BigNumber(secondTokenReserve)
                .multipliedBy(`1e-${secondToken.decimals}`)
                .multipliedBy(secondTokenPriceUSD);
        } catch (error) {
            if (this.debug)
                console.log(
                    'error computeSecondTokenLockedValueUSD',
                    pairAddress,
                );
            return new BigNumber(0);
        }
    }

    private async getFirstTokenReserve(
        pairAddress: string,
    ): Promise<BigNumber> {
        return new BigNumber(
            this.pairsState?.[pairAddress]['firstTokenReserves'],
        );
    }

    private async getSecondTokenReserve(
        pairAddress: string,
    ): Promise<BigNumber> {
        try {
            return new BigNumber(
                this.pairsState[pairAddress]['secondTokenReserves'],
            );
        } catch (error) {
            if (this.debug) console.log('error getSecondTokenReserve');
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
            if (this.debug)
                console.log('error computeSecondTokenPriceUSD', pairAddress);
            return '0';
        }
    }

    private async computeTokenPriceUSD(tokenID: string): Promise<BigNumber> {
        return constantsConfig.USDC_TOKEN_ID === tokenID
            ? new BigNumber(1)
            : await this.getPriceUSDByPath(tokenID);
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
        const [
            wrappedTokenID,
            firstTokenID,
            secondTokenID,
            pairInfo,
        ] = await Promise.all([
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
        if (this.pairsState[pairAddress]) {
            return new PairInfoModel({
                reserves0: this.pairsState[pairAddress]['firstTokenReserves'],
                reserves1: this.pairsState[pairAddress]['secondTokenReserves'],
                totalSupply: this.pairsState[pairAddress][
                    'liquidityPoolSupply'
                ],
            });
        }
        if (this.debug)
            console.log(
                'no pair info metadata from getPairInfoMetadata yet',
                pairAddress,
            );
        return undefined;
    }

    private async computeLockedValueUSD(
        pairAddress: string,
    ): Promise<BigNumber> {
        const [
            firstTokenLockedValueUSD,
            secondTokenLockedValueUSD,
        ] = await Promise.all([
            this.computeFirstTokenLockedValueUSD(pairAddress),
            this.computeSecondTokenLockedValueUSD(pairAddress),
        ]);

        return new BigNumber(firstTokenLockedValueUSD).plus(
            secondTokenLockedValueUSD,
        );
    }

    private getAllPairAddresses(): string[] {
        let pairAddresses = [];
        for (var pairAddress in this.pairsState) {
            pairAddresses.push(pairAddress);
        }
        return pairAddresses;
    }

    private async computeTotalLockedValueUSD(): Promise<BigNumber> {
        try {
            const pairaddresses = this.getAllPairAddresses();

            let totalValueLockedUSD = new BigNumber(0);
            const promises = pairaddresses.map(pairAddress =>
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
            if (this.debug) console.log('error computeTotalLockedValueUSD');
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
                case this.pairsState[pair].firstTokenID:
                    lockedValue = this.pairsState[pair].firstTokenReserves;
                    break;
                case this.pairsState[pair].secondTokenID:
                    lockedValue = this.pairsState[pair].secondTokenReserves;
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
        let graph = await this.getPairsMap();
        if (!graph.has(tokenID)) {
            if (this.debug)
                console.log(
                    `graph ${JSON.stringify(
                        graph,
                    )} does not contain ${tokenID}`,
                );
            return new BigNumber(0);
        }

        const pathTokenProviderUSD = graph
            .get(tokenID)
            .find(entry => entry === this.wegldID);

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
        console.log("Can't getPriceUSDByPath", tokenID);
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
                this.pairsState[pairAddress].firstTokenID,
                this.pairsState[pairAddress].secondTokenID,
            ]);

            switch (tokenID) {
                case firstTokenID:
                    return this.computeFirstTokenPrice(pairAddress);
                case secondTokenID:
                    return this.computeFirstTokenPrice(pairAddress);
            }
        } catch (error) {
            throw error;
        }
    }

    private async getPairsMap(
        forceRefresh: boolean = false,
    ): Promise<Map<string, string[]>> {
        try {
            if (this.pairsMap && !forceRefresh) {
                return this.pairsMap;
            }

            let pairsMetadata: PairMetadata[] = await this.getAllPairsMetadata();

            const pairsMap = new Map<string, string[]>();
            for (const pairMetadata of pairsMetadata) {
                pairsMap.set(pairMetadata.firstTokenID, []);
                pairsMap.set(pairMetadata.secondTokenID, []);
            }

            pairsMetadata.forEach(pair => {
                pairsMap.get(pair.firstTokenID).push(pair.secondTokenID);
                pairsMap.get(pair.secondTokenID).push(pair.firstTokenID);
            });

            return pairsMap;
        } catch (error) {
            throw error;
        }
    }

    private async processPriceDiscoveryEvent(
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

        await Promise.all([
            this.elrondDataService.ingestObject(
                elrondData.timescale.table,
                data,
                Number(event.getTopics()['timestamp']),
            ),
        ]);
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
        const decimals = await this.elrondApiService.getCollection(
            identifier,
            'extract=decimals',
        );
        this.launchedTokensDecimals[identifier] = decimals;
        return decimals;
    }

    private async getAllPairsMetadata(): Promise<PairMetadata[]> {
        let pairsMetadata: PairMetadata[] = await this.routerGetterService.getPairsMetadata();
        try {
            Object.keys(this.pairsState).forEach(pairAddress => {
                if (
                    pairsMetadata.find(p => p.address === pairAddress) ===
                    undefined
                ) {
                    pairsMetadata.push(
                        new PairMetadata({
                            address: pairAddress,
                            firstTokenID: this.pairsState[pairAddress]
                                .firstTokenID,
                            secondTokenID: this.pairsState[pairAddress]
                                .secondTokenID,
                        }),
                    );
                }
            });
        } catch (error) {
            if (this.debug)
                console.log('Error when trying to getAllPairsMetadata', error);
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
            p =>
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
}
