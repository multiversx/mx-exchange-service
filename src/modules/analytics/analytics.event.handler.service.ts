import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { awsConfig } from 'src/config';
import { AWSTimestreamWriteService } from 'src/services/aws/aws.timestream.write';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { convertTokenToDecimal } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { PairComputeService } from '../pair/services/pair.compute.service';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { PairSetterService } from '../pair/services/pair.setter.service';
import { RouterGetterService } from '../router/router.getter.service';
import { RouterSetterService } from '../router/router.setter.service';
import { PAIR_EVENTS } from '../websocket/entities/generic.types';
import {
    AddLiquidityEventType,
    SwapEventType,
} from '../websocket/entities/pair/pair.types';

@Injectable()
export class AnalyticsEventHandlerService {
    private invalidatedKeys = [];

    constructor(
        private readonly pairGetterService: PairGetterService,
        private readonly pairSetterService: PairSetterService,
        private readonly pairComputeService: PairComputeService,
        private readonly routerGetterService: RouterGetterService,
        private readonly routerSetterService: RouterSetterService,
        private readonly awsTimestreamWrite: AWSTimestreamWriteService,
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
            event.firstTokenAmount.amount,
            firstToken.decimals,
        );
        const secondAmountDenom = convertTokenToDecimal(
            event.secondTokenAmount.amount,
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
            timestamp: event.timestamp,
            firstTokenLocked: event.pairReserves[0].amount,
            firstTokenLockedValueUSD: firstTokenLockedValueUSD,
            secondTokenLocked: event.pairReserves[1].amount,
            secondTokenLockedValueUSD: secondTokenLockedValueUSD,
            lockedValueUSD: pairLockedValueUSD,
            liquidity: event.liquidityPoolSupply,
        };

        await this.awsTimestreamWrite.ingest({
            TableName: awsConfig.timestream.tableName,
            Time: event.timestamp,
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

        const [firstTokenAmount, secondTokenAmount] =
            firstToken.identifier === event.tokenAmountIn.tokenID
                ? [event.tokenAmountIn.amount, event.tokenAmountOut.amount]
                : [event.tokenAmountOut.amount, event.tokenAmountIn.amount];
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
            firstTokenLockedValue: event.pairReserves[0].amount,
            secondTokenLockedValue: event.pairReserves[1].amount,
            firstTokenVolume: firstTokenAmount,
            secondTokenVolume: secondTokenAmount,
            volumeUSD: volumeUSD,
            feesUSD: feesUSD,
        };

        await this.awsTimestreamWrite.ingest({
            TableName: awsConfig.timestream.tableName,
            Time: event.timestamp,
            data,
        });
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
