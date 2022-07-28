import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { awsConfig } from 'src/config';
import { AWSTimestreamQueryService } from 'src/services/aws/aws.timestream.query';
import { AWSTimestreamWriteService } from 'src/services/aws/aws.timestream.write';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { denominateAmount } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { PairComputeService } from '../../pair/services/pair.compute.service';
import { PairGetterService } from '../../pair/services/pair.getter.service';
import { PairSetterService } from '../../pair/services/pair.setter.service';
import { RouterComputeService } from '../../router/services/router.compute.service';
import { RouterSetterService } from '../../router/services/router.setter.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { ContextService } from 'src/services/context/context.service';
import { AddLiquidityEventType, SwapEventType } from '@elrondnetwork/erdjs-dex';
import { TokenSetterService } from 'src/modules/tokens/services/token.setter.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';

@Injectable()
export class AnalyticsEventHandlerService {
    constructor(
        private readonly context: ContextService,
        private readonly contextGetter: ContextGetterService,
        private readonly pairGetterService: PairGetterService,
        private readonly pairSetterService: PairSetterService,
        private readonly pairComputeService: PairComputeService,
        private readonly tokenSetterService: TokenSetterService,
        private readonly tokenComputeService: TokenComputeService,
        private readonly routerSetterService: RouterSetterService,
        private readonly routerComputeService: RouterComputeService,
        private readonly awsTimestreamWrite: AWSTimestreamWriteService,
        private readonly awsTimestreamQuery: AWSTimestreamQueryService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleAddLiquidityEvent(event: AddLiquidityEventType): Promise<void> {
        await this.updatePairLockedValueUSD(event.address);
        const [
            firstTokenLockedValueUSD,
            secondTokenLockedValueUSD,
            pairLockedValueUSD,
            newTotalLockedValueUSD,
        ] = await Promise.all([
            this.pairGetterService.getFirstTokenLockedValueUSD(event.address),
            this.pairGetterService.getSecondTokenLockedValueUSD(event.address),
            this.pairGetterService.getLockedValueUSD(event.address),
            this.routerComputeService.computeTotalLockedValueUSD(),
        ]);

        const data = [];
        data['factory'] = {
            totalLockedValueUSD: newTotalLockedValueUSD.toFixed(),
        };
        data[event.address] = {
            firstTokenLocked: event.firstTokenReserves,
            firstTokenLockedValueUSD: firstTokenLockedValueUSD,
            secondTokenLocked: event.secondTokenReserves,
            secondTokenLockedValueUSD: secondTokenLockedValueUSD,
            lockedValueUSD: pairLockedValueUSD,
            liquidity: event.liquidityPoolSupply,
        };
        data[event.firstToken.tokenID] = await this.getTokenLiquidityData(
            event.firstToken.tokenID,
        );
        data[event.secondToken.tokenID] = await this.getTokenLiquidityData(
            event.secondToken.tokenID,
        );

        await this.awsTimestreamWrite.ingest({
            TableName: awsConfig.timestream.tableName,
            data,
            Time: event.timestamp,
        });

        const cacheKey = await this.routerSetterService.setTotalLockedValueUSD(
            newTotalLockedValueUSD.toFixed(),
        );
        await this.deleteCacheKeys([cacheKey]);
    }

    async handleSwapEvents(event: SwapEventType): Promise<void> {
        await this.updatePairPrices(event.address);
        await this.updatePairLockedValueUSD(event.address);
        await Promise.all([
            this.updateTokenPrices(event.tokenIn.tokenID),
            this.updateTokenPrices(event.tokenOut.tokenID),
        ]);
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
            this.contextGetter.getTokenMetadata(event.tokenIn.tokenID),
            this.contextGetter.getTokenMetadata(event.tokenOut.tokenID),
            this.pairGetterService.getTokenPriceUSD(event.tokenIn.tokenID),
            this.pairGetterService.getTokenPriceUSD(event.tokenOut.tokenID),
            this.pairGetterService.getFirstTokenLockedValueUSD(event.address),
            this.pairGetterService.getSecondTokenLockedValueUSD(event.address),
            this.pairGetterService.getTotalSupply(event.address),
            this.pairGetterService.getTotalFeePercent(event.address),
            this.routerComputeService.computeTotalLockedValueUSD(),
        ]);

        const [firstTokenPrice, secondTokenPrice] = await Promise.all([
            this.pairGetterService.getFirstTokenPrice(event.address),
            this.pairGetterService.getSecondTokenPrice(event.address),
        ]);

        const [tokenInAmountDenom, tokenOutAmountDenom] = [
            denominateAmount(event.tokenIn.amount, tokenIn.decimals),
            denominateAmount(event.tokenOut.amount, tokenOut.decimals),
        ];

        const [tokenInAmountUSD, tokenOutAmountUSD] = [
            tokenInAmountDenom.times(tokenInPriceUSD),
            tokenOutAmountDenom.times(tokenOutPriceUSD),
        ];

        const pairLockedValueUSD = new BigNumber(firstTokenLockedValueUSD)
            .plus(secondTokenLockedValueUSD)
            .toFixed();
        const volumeUSD = tokenInAmountUSD.plus(tokenOutAmountUSD).dividedBy(2);
        const feesUSD = tokenInAmountUSD.times(totalFeePercent);

        const data = [];
        data[event.address] = {
            firstTokenPrice: firstTokenPrice,
            firstTokenLocked:
                event.tokenIn.tokenID === firstTokenID
                    ? event.tokenInReserves
                    : event.tokenOutReserves,
            firstTokenLockedValueUSD: firstTokenLockedValueUSD,
            secondTokenPrice: secondTokenPrice,
            secondTokenLocked:
                event.tokenOut.tokenID === secondTokenID
                    ? event.tokenOutReserves
                    : event.tokenInReserves,
            secondTokenLockedValueUSD: secondTokenLockedValueUSD,
            firstTokenVolume:
                firstTokenID === tokenIn.identifier
                    ? event.tokenIn.amount
                    : event.tokenOut.amount,
            secondTokenVolume:
                secondTokenID === tokenOut.identifier
                    ? event.tokenOut.amount
                    : event.tokenIn.amount,
            lockedValueUSD: pairLockedValueUSD,
            liquidity: liquidityPoolSupply,
            volumeUSD: volumeUSD,
            feesUSD: feesUSD,
        };

        data[event.tokenIn.tokenID] = await this.getTokenSwapData(
            event.tokenIn.tokenID,
            event.tokenIn.amount,
        );
        data[event.tokenOut.tokenID] = await this.getTokenSwapData(
            event.tokenOut.tokenID,
            event.tokenOut.amount,
        );

        data['factory'] = {
            totalLockedValueUSD: newTotalLockedValueUSD.toFixed(),
        };

        await this.awsTimestreamWrite.ingest({
            TableName: awsConfig.timestream.tableName,
            data,
            Time: event.timestamp,
        });

        const [
            firstTokenVolume24h,
            secondTokenVolume24h,
            volumeUSD24h,
            feesUSD24h,
            totalVolumeUSD24h,
            totalFeesUSD24h,
        ] = await Promise.all([
            this.awsTimestreamQuery.getAggregatedValue({
                table: awsConfig.timestream.tableName,
                series: event.address,
                metric: 'firstTokenVolume',
                time: '24h',
            }),
            this.awsTimestreamQuery.getAggregatedValue({
                table: awsConfig.timestream.tableName,
                series: event.address,
                metric: 'secondTokenVolume',
                time: '24h',
            }),
            this.awsTimestreamQuery.getAggregatedValue({
                table: awsConfig.timestream.tableName,
                series: event.address,
                metric: 'volumeUSD',
                time: '24h',
            }),
            this.awsTimestreamQuery.getAggregatedValue({
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
        await this.deleteCacheKeys(cacheKeys);
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
        await this.deleteCacheKeys(cacheKeys);
    }

    private async updatePairPrices(pairAddress: string): Promise<void> {
        const [
            firstTokenPrice,
            secondTokenPrice,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
            lpTokenPriceUSD,
        ] = await Promise.all([
            this.pairComputeService.computeFirstTokenPrice(pairAddress),
            this.pairComputeService.computeSecondTokenPrice(pairAddress),
            this.pairComputeService.computeFirstTokenPriceUSD(pairAddress),
            this.pairComputeService.computeSecondTokenPriceUSD(pairAddress),
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
                firstTokenPriceUSD,
            ),
            this.pairSetterService.setSecondTokenPriceUSD(
                pairAddress,
                secondTokenPriceUSD,
            ),
            this.pairSetterService.setLpTokenPriceUSD(
                pairAddress,
                lpTokenPriceUSD,
            ),
        ]);
        await this.deleteCacheKeys(cacheKeys);
    }

    private async updateTokenPrices(tokenID: string): Promise<void> {
        const [derivedEGLD, derivedUSD] = await Promise.all([
            this.tokenComputeService.computeTokenPriceDerivedEGLD(tokenID),
            this.tokenComputeService.computeTokenPriceDerivedUSD(tokenID),
        ]);
        const cacheKeys = await Promise.all([
            this.tokenSetterService.setDerivedEGLD(tokenID, derivedEGLD),
            this.tokenSetterService.setDerivedUSD(tokenID, derivedUSD),
        ]);
        await this.deleteCacheKeys(cacheKeys);
    }

    private async getTokenLiquidityData(tokenID: string): Promise<any> {
        const [token, priceUSD, pairs] = await Promise.all([
            this.contextGetter.getTokenMetadata(tokenID),
            this.pairGetterService.getTokenPriceUSD(tokenID),
            this.context.getPairsMetadata(),
        ]);

        let newLockedValue = new BigNumber(0);

        for (const pair of pairs) {
            let lockedValue = '0';
            switch (tokenID) {
                case pair.firstTokenID:
                    lockedValue = await this.pairGetterService.getFirstTokenReserve(
                        pair.address,
                    );
                    break;
                case pair.secondTokenID:
                    lockedValue = await this.pairGetterService.getSecondTokenReserve(
                        pair.address,
                    );
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
            this.contextGetter.getTokenMetadata(tokenID),
            this.pairGetterService.getTokenPriceUSD(tokenID),
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

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
