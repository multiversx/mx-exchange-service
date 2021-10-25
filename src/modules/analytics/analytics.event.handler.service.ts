import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { awsConfig } from 'src/config';
import { AWSTimestreamQueryService } from 'src/services/aws/aws.timestream.query';
import { AWSTimestreamWriteService } from 'src/services/aws/aws.timestream.write';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { convertTokenToDecimal } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { PairComputeService } from '../pair/services/pair.compute.service';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { PairSetterService } from '../pair/services/pair.setter.service';
import { RouterComputeService } from '../router/router.compute.service';
import { RouterGetterService } from '../router/router.getter.service';
import { RouterSetterService } from '../router/router.setter.service';
import { PAIR_EVENTS } from '../rabbitmq/entities/generic.types';
import {
    AddLiquidityEventType,
    SwapEventType,
} from '../rabbitmq/entities/pair/pair.types';

@Injectable()
export class AnalyticsEventHandlerService {
    private invalidatedKeys = [];

    constructor(
        private readonly pairGetterService: PairGetterService,
        private readonly pairSetterService: PairSetterService,
        private readonly pairComputeService: PairComputeService,
        private readonly routerGetterService: RouterGetterService,
        private readonly routerSetterService: RouterSetterService,
        private readonly routerComputeService: RouterComputeService,
        private readonly awsTimestreamWrite: AWSTimestreamWriteService,
        private readonly awsTimestreamQuery: AWSTimestreamQueryService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleAddLiquidityEvent(
        event: AddLiquidityEventType,
        eventType: string,
    ): Promise<void> {
        await this.updatePairLockedValueUSD(event.address);
        const [
            firstToken,
            secondtoken,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
            firstTokenLockedValueUSD,
            secondTokenLockedValueUSD,
            pairLockedValueUSD,
            totalLockedValueUSD,
        ] = await Promise.all([
            this.pairGetterService.getFirstToken(event.address),
            this.pairGetterService.getSecondToken(event.address),
            this.pairGetterService.getFirstTokenPriceUSD(event.address),
            this.pairGetterService.getSecondTokenPriceUSD(event.address),
            this.pairGetterService.getFirstTokenLockedValueUSD(event.address),
            this.pairGetterService.getSecondTokenLockedValueUSD(event.address),
            this.pairGetterService.getLockedValueUSD(event.address),
            this.routerGetterService.getTotalLockedValueUSD(),
        ]);

        const firstAmountDenom = convertTokenToDecimal(
            event.firstToken.amount,
            firstToken.decimals,
        );
        const secondAmountDenom = convertTokenToDecimal(
            event.secondToken.amount,
            secondtoken.decimals,
        );
        const firstAmountUSD = firstAmountDenom.multipliedBy(
            firstTokenPriceUSD,
        );
        const secondAmountUSD = secondAmountDenom.multipliedBy(
            secondTokenPriceUSD,
        );
        const lockedAmountUSD = firstAmountUSD.plus(secondAmountUSD);

        if (eventType === PAIR_EVENTS.ADD_LIQUIDITY) {
            this.invalidatedKeys.push(
                this.routerSetterService.setTotalLockedValueUSD(
                    new BigNumber(totalLockedValueUSD)
                        .plus(lockedAmountUSD)
                        .toFixed(),
                ),
            );
        } else {
            this.invalidatedKeys.push(
                this.routerSetterService.setTotalLockedValueUSD(
                    new BigNumber(totalLockedValueUSD)
                        .minus(lockedAmountUSD)
                        .toFixed(),
                ),
            );
        }

        const data = [];
        data[event.address] = {
            firstTokenLocked: event.firstTokenReserves,
            firstTokenLockedValueUSD: firstTokenLockedValueUSD,
            secondTokenLocked: event.secondTokenReserves,
            secondTokenLockedValueUSD: secondTokenLockedValueUSD,
            lockedValueUSD: pairLockedValueUSD,
            liquidity: event.liquidityPoolSupply,
        };

        await this.awsTimestreamWrite.ingest({
            TableName: awsConfig.timestream.tableName,
            data,
        });
    }

    async handleSwapEvents(event: SwapEventType): Promise<void> {
        await this.updatePairPrices(event.address);
        await this.updatePairLockedValueUSD(event.address);

        const [
            firstToken,
            secondToken,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
            totalFeePercent,
        ] = await Promise.all([
            this.pairGetterService.getFirstToken(event.address),
            this.pairGetterService.getSecondToken(event.address),
            this.pairGetterService.getFirstTokenPriceUSD(event.address),
            this.pairGetterService.getSecondTokenPriceUSD(event.address),
            this.pairGetterService.getTotalFeePercent(event.address),
        ]);

        const [
            firstTokenAmount,
            secondTokenAmount,
            firstTokenReserves,
            secondTokenReserves,
        ] =
            firstToken.identifier === event.tokenIn.tokenID
                ? [
                      event.tokenIn.amount,
                      event.tokenOut.amount,
                      event.tokenInReserves,
                      event.tokenOutReserves,
                  ]
                : [
                      event.tokenOut.amount,
                      event.tokenIn.amount,
                      event.tokenOutReserves,
                      event.tokenInReserves,
                  ];
        const [firstTokenAmountDenom, secondTokenAmountDenom] = [
            convertTokenToDecimal(firstTokenAmount, firstToken.decimals),
            convertTokenToDecimal(secondTokenAmount, secondToken.decimals),
        ];

        const [firstTokenAmountUSD, secondTokenAmountUSD] = [
            firstTokenAmountDenom.multipliedBy(firstTokenPriceUSD),
            secondTokenAmountDenom.multipliedBy(secondTokenPriceUSD),
        ];

        const volumeUSD = firstTokenAmountUSD
            .plus(secondTokenAmountUSD)
            .dividedBy(2);
        const feesUSD = firstTokenAmountUSD
            .plus(secondTokenAmountUSD)
            .multipliedBy(totalFeePercent);

        const data = [];
        data[event.address] = {
            firstTokenPriceUSD: firstTokenPriceUSD,
            secondTokenPriceUSD: secondTokenPriceUSD,
            firstTokenLockedValue: firstTokenReserves,
            secondTokenLockedValue: secondTokenReserves,
            firstTokenVolume: firstTokenAmount,
            secondTokenVolume: secondTokenAmount,
            volumeUSD: volumeUSD,
            feesUSD: feesUSD,
        };

        await this.awsTimestreamWrite.ingest({
            TableName: awsConfig.timestream.tableName,
            data,
        });

        const [
            firstTokenVolume24h,
            secondTokenVolume24h,
            volumeUSD24h,
            feesUSD24h,
            totalVolumeUSD24h,
            totalFeesUSD24h,
        ] = await Promise.all([
            this.awsTimestreamQuery.getAgregatedValue({
                table: awsConfig.timestream.tableName,
                series: event.address,
                metric: 'firstTokenVolume',
                time: '24h',
            }),
            this.awsTimestreamQuery.getAgregatedValue({
                table: awsConfig.timestream.tableName,
                series: event.address,
                metric: 'secondTokenVolume',
                time: '24h',
            }),
            this.awsTimestreamQuery.getAgregatedValue({
                table: awsConfig.timestream.tableName,
                series: event.address,
                metric: 'volumeUSD',
                time: '24h',
            }),
            this.awsTimestreamQuery.getAgregatedValue({
                table: awsConfig.timestream.tableName,
                series: event.address,
                metric: 'feesUSD',
                time: '24h',
            }),
            this.routerComputeService.computeTotalVolumeUSD('24h'),
            this.routerComputeService.computeTotalFeesUSD('24h'),
        ]);

        const cacheKeys = await Promise.all([
            this.pairSetterService.setFirstTokenVolume(
                event.address,
                firstTokenVolume24h,
                '24h',
            ),
            this.pairSetterService.setSecondTokenVolume(
                event.address,
                secondTokenVolume24h,
                '24h',
            ),
            this.pairSetterService.setVolumeUSD(
                event.address,
                volumeUSD24h,
                '24h',
            ),
            this.pairSetterService.setFeesUSD(event.address, feesUSD24h, '24h'),
            this.routerSetterService.setTotalVolumeUSD(
                totalVolumeUSD24h.toFixed(),
                '24h',
            ),
            this.routerSetterService.setTotalFeesUSD(
                totalFeesUSD24h.toFixed(),
                '24h',
            ),
        ]);
        this.invalidatedKeys.push(cacheKeys);
        await this.deleteCacheKeys();
    }

    private async updatePairLockedValueUSD(pairAddress: string): Promise<void> {
        const [
            firstTokenLockedValueUSD,
            secondTokenLockedValueUSD,
            pairLockedValueUSD,
        ] = await Promise.all([
            this.pairComputeService.computeFirstTokenLockedValueUSD(
                pairAddress,
            ),
            this.pairComputeService.computeSecondTokenLockedValueUSD(
                pairAddress,
            ),
            this.pairComputeService.computeLockedValueUSD(pairAddress),
        ]);
        const cacheKeys = await Promise.all([
            this.pairSetterService.setFirstTokenLockedValueUSD(
                pairAddress,
                firstTokenLockedValueUSD.toFixed(),
            ),
            this.pairSetterService.setSecondTokenLockedValueUSD(
                pairAddress,
                secondTokenLockedValueUSD.toFixed(),
            ),
            this.pairSetterService.setLockedValueUSD(
                pairAddress,
                pairLockedValueUSD.toFixed(),
            ),
        ]);
        this.invalidatedKeys.push(cacheKeys);
        await this.deleteCacheKeys();
    }

    private async updatePairPrices(pairAddress: string): Promise<void> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(pairAddress),
            this.pairGetterService.getSecondTokenID(pairAddress),
        ]);
        const [
            firstTokenPrice,
            secondTokenPrice,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
            lpTokenPriceUSD,
        ] = await Promise.all([
            this.pairComputeService.computeFirstTokenPrice(pairAddress),
            this.pairComputeService.computeSecondTokenPrice(pairAddress),
            this.pairComputeService.computeTokenPriceUSD(firstTokenID),
            this.pairComputeService.computeTokenPriceUSD(secondTokenID),
            this.pairComputeService.computeLpTokenPriceUSD(pairAddress),
        ]);
        const cacheKeys = await Promise.all([
            this.pairSetterService.setFirstTokenPrice(
                pairAddress,
                firstTokenPrice,
            ),
            this.pairSetterService.setSecondTokenPrice(
                pairAddress,
                secondTokenPrice,
            ),
            this.pairSetterService.setFirstTokenPriceUSD(
                pairAddress,
                firstTokenPriceUSD.toFixed(),
            ),
            this.pairSetterService.setSecondTokenPriceUSD(
                pairAddress,
                secondTokenPriceUSD.toFixed(),
            ),
            this.pairSetterService.setLpTokenPriceUSD(
                pairAddress,
                lpTokenPriceUSD,
            ),
        ]);
        this.invalidatedKeys.push(cacheKeys);
        await this.deleteCacheKeys();
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
