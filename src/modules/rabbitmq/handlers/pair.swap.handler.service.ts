import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import BigNumber from 'bignumber.js';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { computeValueUSD } from 'src/utils/token.converters';
import { PairComputeService } from '../../pair/services/pair.compute.service';
import { PairSetterService } from '../../pair/services/pair.setter.service';
import {
    PAIR_EVENTS,
    SwapEvent,
    SwapNoFeeEvent,
} from '@multiversx/sdk-exchange';
import { PairHandler } from './pair.handler.service';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { TokenSetterService } from 'src/modules/tokens/services/token.setter.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { TradingActivityAction } from 'src/modules/analytics/models/trading.activity.model';
import { determineBaseAndQuoteTokens } from 'src/utils/pair.utils';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { EventsBatchContext } from './events.batch.context';
import { quote } from 'src/modules/pair/pair.utils';

export enum SWAP_IDENTIFIER {
    SWAP_FIXED_INPUT = 'swapTokensFixedInput',
    SWAP_FIXED_OUTPUT = 'swapTokensFixedOutput',
}

@Injectable()
export class SwapEventHandler {
    constructor(
        private readonly pairAbi: PairAbiService,
        @Inject(forwardRef(() => PairService))
        private readonly pairService: PairService,
        private readonly pairSetter: PairSetterService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairCompute: PairComputeService,
        private readonly routerAbi: RouterAbiService,
        @Inject(forwardRef(() => TokenComputeService))
        private readonly tokenCompute: TokenComputeService,
        private readonly tokenSetter: TokenSetterService,
        private readonly pairHandler: PairHandler,
        private readonly dataApi: MXDataApiService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleSwapEvents(
        event: SwapEvent,
        context: EventsBatchContext,
    ): Promise<[any[], number]> {
        const handlerProfiler = new PerformanceProfiler();
        const timings: Record<string, number> = {};

        const [
            firstToken,
            secondToken,
            commonTokensIDs,
            usdcPrice,
            liquidity,
            totalFeePercent,
        ] = await this.measure(timings, 'pairMetadata', () =>
            Promise.all([
                this.pairService.getFirstToken(event.address),
                this.pairService.getSecondToken(event.address),
                this.routerAbi.commonTokensForUserPairs(),
                this.dataApi.getTokenPrice('USDC'),
                this.pairAbi.totalSupply(event.address),
                this.pairAbi.totalFeePercent(event.address),
            ]),
        );

        const [
            firstTokenAmount,
            secondTokenAmount,
            firstTokenReserve,
            secondTokenReserve,
        ] =
            event.getTokenIn().tokenID === firstToken.identifier
                ? [
                      event.getTokenIn().amount.toFixed(),
                      event.getTokenOut().amount.toFixed(),
                      event.getTokenInReserves().toFixed(),
                      event.getTokenOutReserves().toFixed(),
                  ]
                : [
                      event.getTokenOut().amount.toFixed(),
                      event.getTokenIn().amount.toFixed(),
                      event.getTokenOutReserves().toFixed(),
                      event.getTokenInReserves().toFixed(),
                  ];

        const firstTokenPrice = quote(
            new BigNumber(`1e${firstToken.decimals}`).toFixed(),
            firstTokenReserve,
            secondTokenReserve,
        )
            .multipliedBy(`1e-${secondToken.decimals}`)
            .toFixed();
        const secondTokenPrice = quote(
            new BigNumber(`1e${secondToken.decimals}`).toFixed(),
            secondTokenReserve,
            firstTokenReserve,
        )
            .multipliedBy(`1e-${firstToken.decimals}`)
            .toFixed();

        await this.measure(timings, 'updateReserves', () =>
            this.pairHandler.updatePairReserves(
                event.getAddress(),
                firstTokenReserve,
                secondTokenReserve,
            ),
        );

        const [firstTokenPriceUSD, secondTokenPriceUSD] = await this.measure(
            timings,
            'tokenPricesUSD',
            () =>
                Promise.all([
                    this.pairCompute.computeFirstTokenPriceUSD(event.address),
                    this.pairCompute.computeSecondTokenPriceUSD(event.address),
                ]),
        );

        const firstTokenValues = {
            firstTokenPrice,
            firstTokenLocked: firstTokenReserve,
            firstTokenLockedValueUSD: computeValueUSD(
                firstTokenReserve,
                firstToken.decimals,
                firstTokenPriceUSD,
            )
                .dividedBy(usdcPrice)
                .toFixed(),
            firstTokenVolume: firstTokenAmount,
        };
        const secondTokenValues = {
            secondTokenPrice,
            secondTokenLocked: secondTokenReserve,
            secondTokenLockedValueUSD: computeValueUSD(
                secondTokenReserve,
                secondToken.decimals,
                secondTokenPriceUSD,
            )
                .dividedBy(usdcPrice)
                .toFixed(),
            secondTokenVolume: secondTokenAmount,
        };

        const lockedValueUSD = new BigNumber(
            firstTokenValues.firstTokenLockedValueUSD,
        )
            .plus(secondTokenValues.secondTokenLockedValueUSD)
            .toFixed();

        const firstTokenVolumeUSD = computeValueUSD(
            firstTokenValues.firstTokenVolume,
            firstToken.decimals,
            firstTokenPriceUSD,
        ).dividedBy(usdcPrice);
        const secondTokenVolumeUSD = computeValueUSD(
            secondTokenValues.secondTokenVolume,
            secondToken.decimals,
            secondTokenPriceUSD,
        ).dividedBy(usdcPrice);

        let volumeUSD: BigNumber;
        let feesUSD: BigNumber;

        let feeAmount = new BigNumber(event.getTokenIn().amount)
            .times(totalFeePercent)
            .toFixed();

        if (
            commonTokensIDs.includes(firstToken.identifier) &&
            commonTokensIDs.includes(secondToken.identifier)
        ) {
            volumeUSD = firstTokenVolumeUSD
                .plus(secondTokenVolumeUSD)
                .dividedBy(2);
            feesUSD =
                event.getTokenIn().tokenID === firstToken.identifier
                    ? computeValueUSD(
                          feeAmount,
                          firstToken.decimals,
                          firstTokenPriceUSD,
                      )
                    : computeValueUSD(
                          feeAmount,
                          secondToken.decimals,
                          secondTokenPriceUSD,
                      );
        } else if (
            commonTokensIDs.includes(firstToken.identifier) &&
            !commonTokensIDs.includes(secondToken.identifier)
        ) {
            volumeUSD = firstTokenVolumeUSD;

            if (event.getTokenIn().tokenID === secondToken.identifier) {
                feeAmount = (
                    await this.measure(timings, 'feeEquivalent', () =>
                        this.pairService.getEquivalentForLiquidity(
                            event.address,
                            secondToken.identifier,
                            feeAmount,
                        ),
                    )
                ).toFixed();
            }

            feesUSD = computeValueUSD(
                feeAmount,
                firstToken.decimals,
                firstTokenPriceUSD,
            );
        } else if (
            !commonTokensIDs.includes(firstToken.identifier) &&
            commonTokensIDs.includes(secondToken.identifier)
        ) {
            volumeUSD = secondTokenVolumeUSD;

            if (event.getTokenIn().tokenID === firstToken.identifier) {
                feeAmount = (
                    await this.measure(timings, 'feeEquivalent', () =>
                        this.pairService.getEquivalentForLiquidity(
                            event.address,
                            firstToken.identifier,
                            feeAmount,
                        ),
                    )
                ).toFixed();
            }

            feesUSD = computeValueUSD(
                feeAmount,
                secondToken.decimals,
                secondTokenPriceUSD,
            );
        } else {
            volumeUSD = new BigNumber(0);
            feesUSD = new BigNumber(0);
        }

        const data = [];
        data[event.address] = {
            ...firstTokenValues,
            ...secondTokenValues,
            lockedValueUSD,
            liquidity,
            volumeUSD: volumeUSD.toFixed(),
            feesUSD: feesUSD.dividedBy(usdcPrice).toFixed(),
        };

        data[firstToken.identifier] = {
            priceUSD: new BigNumber(firstTokenPriceUSD)
                .dividedBy(usdcPrice)
                .toFixed(),
            volume: firstTokenAmount,
            volumeUSD: firstTokenVolumeUSD.toFixed(),
        };
        data[secondToken.identifier] = {
            priceUSD: new BigNumber(secondTokenPriceUSD)
                .dividedBy(usdcPrice)
                .toFixed(),
            volume: secondTokenAmount,
            volumeUSD: secondTokenVolumeUSD.toFixed(),
        };

        context.trackTokenLockedValue(
            firstToken.identifier,
            firstToken.decimals,
            firstTokenPriceUSD,
        );
        context.trackTokenLockedValue(
            secondToken.identifier,
            secondToken.decimals,
            secondTokenPriceUSD,
        );

        await this.measure(timings, 'updatePairPrices', () =>
            this.updatePairPrices(
                event.address,
                firstTokenPrice,
                secondTokenPrice,
                firstTokenPriceUSD,
                secondTokenPriceUSD,
            ),
        );
        await this.measure(timings, 'updateTokenPrices', () =>
            Promise.all([
                this.updateTokenPrices(firstToken.identifier),
                this.updateTokenPrices(secondToken.identifier),
            ]),
        );

        if (event.getIdentifier() === SWAP_IDENTIFIER.SWAP_FIXED_INPUT) {
            this.publish(SWAP_IDENTIFIER.SWAP_FIXED_INPUT, {
                swapFixedInputEvent: event,
            });
        } else {
            this.publish(SWAP_IDENTIFIER.SWAP_FIXED_OUTPUT, {
                swapFixedOutputEvent: event,
            });
        }

        const pair = new PairMetadata({
            address: event.getAddress(),
            firstTokenID: firstToken.identifier,
            secondTokenID: secondToken.identifier,
        });

        const { quoteToken } = determineBaseAndQuoteTokens(
            pair,
            commonTokensIDs,
        );

        const tradingActivity = {
            hash: event['txHash'],
            address: event.getAddress(),
            timestamp: event.getTimestamp(),
            action:
                quoteToken === event.getTokenOut().tokenID
                    ? TradingActivityAction.BUY
                    : TradingActivityAction.SELL,
            inputToken: {
                ...(event.getTokenIn().tokenID === firstToken.identifier
                    ? firstToken
                    : secondToken),
                balance: event.getTokenIn().amount.toFixed(),
            },
            outputToken: {
                ...(event.getTokenOut().tokenID === firstToken.identifier
                    ? firstToken
                    : secondToken),
                balance: event.getTokenOut().amount.toFixed(),
            },
        };

        this.publish('tradingActivityEvent', {
            tradingActivityEvent: tradingActivity,
        });

        handlerProfiler.stop();

        this.logger.info('handleSwapEvents timings', {
            context: SwapEventHandler.name,
            address: event.getAddress(),
            txHash: event['txHash'],
            total: this.round(handlerProfiler.duration),
            awaited: this.round(
                Object.values(timings).reduce((sum, ms) => sum + ms, 0),
            ),
            ...timings,
        });

        return [data, event.getTimestamp().toNumber()];
    }

    async handleSwapNoFeeEvent(event: SwapNoFeeEvent): Promise<void> {
        this.publish(PAIR_EVENTS.SWAP_NO_FEE, {
            swapNoFeeEvent: event,
        });
    }

    private async updatePairPrices(
        pairAddress: string,
        firstTokenPrice: string,
        secondTokenPrice: string,
        firstTokenPriceUSD: string,
        secondTokenPriceUSD: string,
    ): Promise<void> {
        const cacheKeys = await Promise.all([
            this.pairSetter.setFirstTokenPrice(pairAddress, firstTokenPrice),
            this.pairSetter.setSecondTokenPrice(pairAddress, secondTokenPrice),
            this.pairSetter.setFirstTokenPriceUSD(
                pairAddress,
                firstTokenPriceUSD,
            ),
            this.pairSetter.setSecondTokenPriceUSD(
                pairAddress,
                secondTokenPriceUSD,
            ),
        ]);
        this.deleteCacheKeys(cacheKeys);
    }

    private async updateTokenPrices(tokenID: string): Promise<void> {
        const [tokenPriceDerivedEGLD, tokenPriceDerivedUSD] = await Promise.all(
            [
                this.tokenCompute.computeTokenPriceDerivedEGLD(tokenID, []),
                this.tokenCompute.computeTokenPriceDerivedUSD(tokenID),
            ],
        );

        const cacheKeys = await Promise.all([
            this.tokenSetter.setDerivedEGLD(tokenID, tokenPriceDerivedEGLD),
            this.tokenSetter.setDerivedUSD(tokenID, tokenPriceDerivedUSD),
        ]);

        this.deleteCacheKeys(cacheKeys);
    }

    private deleteCacheKeys(invalidatedKeys: string[]): void {
        this.publish('deleteCacheKeys', invalidatedKeys);
    }

    /**
     * Times one awaited phase of the handler. Phases entered more than once
     * (the conditional fee lookups) accumulate into a single total.
     */
    private async measure<T>(
        timings: Record<string, number>,
        phase: string,
        work: () => Promise<T>,
    ): Promise<T> {
        const profiler = new PerformanceProfiler();
        try {
            return await work();
        } finally {
            profiler.stop();
            timings[phase] = this.round(
                (timings[phase] ?? 0) + profiler.duration,
            );
        }
    }

    private round(duration: number): number {
        return Math.round(duration * 100) / 100;
    }

    private publish(trigger: string, payload: any): void {
        this.pubSub.publish(trigger, payload).catch((error) => {
            this.logger.error(`Failed to publish ${trigger}`, {
                context: SwapEventHandler.name,
                error: error?.message ?? error,
            });
        });
    }
}
