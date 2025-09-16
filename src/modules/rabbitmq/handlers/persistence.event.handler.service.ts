import {
    AddLiquidityEvent,
    CreatePairEvent,
    PairSwapEnabledEvent,
    SwapEvent,
} from '@multiversx/sdk-exchange';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairDocument } from 'src/modules/pair/persistence/schemas/pair.schema';
import { PairPersistenceService } from 'src/modules/pair/persistence/services/pair.persistence.service';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { TokenPersistenceService } from 'src/modules/tokens/persistence/services/token.persistence.service';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { computeValueUSD } from 'src/utils/token.converters';

@Injectable()
export class PersistenceEventHandlerService {
    constructor(
        private readonly pairPersistence: PairPersistenceService,
        private readonly tokenPersistence: TokenPersistenceService,
        private readonly dataApi: MXDataApiService,
        private readonly routerAbi: RouterAbiService,
    ) {}

    async handleCreatePairEvent(event: CreatePairEvent): Promise<void> {
        const profiler = new PerformanceProfiler();

        const { address, firstTokenID, secondTokenID } = event.toJSON();

        const pair = await this.pairPersistence.populatePairModel(
            new PairMetadata({ address, firstTokenID, secondTokenID }),
        );

        await this.pairPersistence.upsertPair(pair);

        profiler.stop();

        console.log(
            `Persistence create pair event handler finished in ${profiler.duration}`,
        );
    }

    async handlePairSwapEnabledEvent(
        event: PairSwapEnabledEvent,
    ): Promise<void> {
        const profiler = new PerformanceProfiler();

        const pairAddress = event.getPairAddress().bech32();

        const pairDocument = await this.pairPersistence.getPair(
            { address: pairAddress },
            { firstTokenId: 1, secondTokenId: 1 },
        );

        const pair = await this.pairPersistence.populatePairModel(
            new PairMetadata({
                address: pairAddress,
                firstTokenID: pairDocument.firstTokenId,
                secondTokenID: pairDocument.secondTokenId,
            }),
        );

        await this.pairPersistence.upsertPair(pair);

        await this.pairPersistence.populatePairsComputedFields();

        profiler.stop();

        console.log(
            `Persistence swap enabled event handler finished in ${profiler.duration}`,
        );
    }

    async handleLiquidityEvent(event: AddLiquidityEvent): Promise<any[]> {
        const profiler = new PerformanceProfiler();

        const [pair, usdcPrice, commonTokenIDs] = await Promise.all([
            this.pairPersistence.getPair(
                {
                    address: event.address,
                },
                {
                    address: 1,
                    firstToken: 1,
                    firstTokenId: 1,
                    secondToken: 1,
                    secondTokenId: 1,
                    liquidityPoolToken: 1,
                    liquidityPoolTokenId: 1,
                    info: 1,
                    state: 1,
                    totalFeePercent: 1,
                },
                {
                    path: 'firstToken secondToken liquidityPoolToken',
                    select: ['identifier', 'decimals', 'price'],
                },
            ),
            this.dataApi.getTokenPrice('USDC'),
            this.routerAbi.commonTokensForUserPairs(),
        ]);

        const firstTokenReserve = event.getFirstTokenReserves().toFixed();
        const secondTokenReserve = event.getSecondTokenReserves().toFixed();

        await this.updatePairReservesAndPrices(
            pair,
            firstTokenReserve,
            secondTokenReserve,
            usdcPrice,
            event.getLiquidityPoolSupply().toFixed(),
        );

        await this.updatePairLiquidityValuesUSD(
            pair,
            usdcPrice,
            commonTokenIDs,
        );

        const newTotalLockedValueUSD =
            await this.pairPersistence.getTotalLockedValueUSD();

        const data = [];
        data['factory'] = {
            totalLockedValueUSD: new BigNumber(newTotalLockedValueUSD)
                .dividedBy(usdcPrice)
                .toFixed(),
        };

        const firstTokenLockedValueUSD = computeValueUSD(
            firstTokenReserve,
            pair.firstToken.decimals,
            pair.firstTokenPriceUSD,
        );
        const secondTokenLockedValueUSD = computeValueUSD(
            secondTokenReserve,
            pair.secondToken.decimals,
            pair.secondTokenPriceUSD,
        );
        const lockedValueUSD = firstTokenLockedValueUSD.plus(
            secondTokenLockedValueUSD,
        );

        data[event.address] = {
            firstTokenLocked: firstTokenReserve,
            firstTokenLockedValueUSD: firstTokenLockedValueUSD
                .dividedBy(usdcPrice)
                .toFixed(),
            secondTokenLocked: secondTokenReserve,
            secondTokenLockedValueUSD: secondTokenLockedValueUSD
                .dividedBy(usdcPrice)
                .toFixed(),
            lockedValueUSD: lockedValueUSD.dividedBy(usdcPrice).toFixed(),
            liquidity: event.getLiquidityPoolSupply().toFixed(),
        };

        const { firstTokenTotalLockedValue, secondTokenTotalLockedValue } =
            await this.getPairTokensTotalLockedValue(pair);

        data[pair.firstToken.identifier] = {
            lockedValue: firstTokenTotalLockedValue,
            lockedValueUSD: computeValueUSD(
                firstTokenTotalLockedValue,
                pair.firstToken.decimals,
                pair.firstTokenPriceUSD,
            )
                .dividedBy(usdcPrice)
                .toFixed(),
        };
        data[pair.secondToken.identifier] = {
            lockedValue: secondTokenTotalLockedValue,
            lockedValueUSD: computeValueUSD(
                secondTokenTotalLockedValue,
                pair.secondToken.decimals,
                pair.secondTokenPriceUSD,
            )
                .dividedBy(usdcPrice)
                .toFixed(),
        };

        profiler.stop();

        console.log(
            `Persistence liquidity event handler finished in ${profiler.duration}`,
        );

        return data;
    }

    async handleSwapEvents(event: SwapEvent): Promise<any[]> {
        const profiler = new PerformanceProfiler();

        const [pair, usdcPrice, commonTokenIDs] = await Promise.all([
            this.pairPersistence.getPair(
                {
                    address: event.address,
                },
                {
                    address: 1,
                    firstToken: 1,
                    firstTokenId: 1,
                    secondToken: 1,
                    secondTokenId: 1,
                    liquidityPoolToken: 1,
                    liquidityPoolTokenId: 1,
                    info: 1,
                    state: 1,
                    totalFeePercent: 1,
                },
                {
                    path: 'firstToken secondToken liquidityPoolToken',
                    select: ['identifier', 'decimals', 'price'],
                },
            ),
            this.dataApi.getTokenPrice('USDC'),
            this.routerAbi.commonTokensForUserPairs(),
        ]);

        const [
            firstTokenAmount,
            secondTokenAmount,
            firstTokenReserve,
            secondTokenReserve,
        ] =
            event.getTokenIn().tokenID === pair.firstToken.identifier
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

        await this.updatePairReservesAndPrices(
            pair,
            firstTokenReserve,
            secondTokenReserve,
            usdcPrice,
        );

        await this.updatePairLiquidityValuesUSD(
            pair,
            usdcPrice,
            commonTokenIDs,
        );

        const newTotalLockedValueUSD =
            await this.pairPersistence.getTotalLockedValueUSD();

        const firstTokenValues = {
            firstTokenPrice: pair.firstTokenPrice,
            firstTokenLocked: firstTokenReserve,
            firstTokenLockedValueUSD: computeValueUSD(
                firstTokenReserve,
                pair.firstToken.decimals,
                pair.firstTokenPriceUSD,
            )
                .dividedBy(usdcPrice)
                .toFixed(),
            firstTokenVolume: firstTokenAmount,
        };

        const secondTokenValues = {
            secondTokenPrice: pair.secondTokenPrice,
            secondTokenLocked: secondTokenReserve,
            secondTokenLockedValueUSD: computeValueUSD(
                secondTokenReserve,
                pair.secondToken.decimals,
                pair.secondTokenPriceUSD,
            )
                .dividedBy(usdcPrice)
                .toFixed(),
            secondTokenVolume: secondTokenAmount,
        };

        const lockedValueUSD = pair.lockedValueUSD;

        const firstTokenVolumeUSD = computeValueUSD(
            firstTokenValues.firstTokenVolume,
            pair.firstToken.decimals,
            pair.firstTokenPriceUSD,
        ).dividedBy(usdcPrice);
        const secondTokenVolumeUSD = computeValueUSD(
            secondTokenValues.secondTokenVolume,
            pair.secondToken.decimals,
            pair.secondTokenPriceUSD,
        ).dividedBy(usdcPrice);

        let volumeUSD: BigNumber;
        let feesUSD: BigNumber;

        let feeAmount = new BigNumber(event.getTokenIn().amount)
            .times(pair.totalFeePercent)
            .toFixed();

        if (
            commonTokenIDs.includes(pair.firstToken.identifier) &&
            commonTokenIDs.includes(pair.secondToken.identifier)
        ) {
            volumeUSD = firstTokenVolumeUSD
                .plus(secondTokenVolumeUSD)
                .dividedBy(2);
            feesUSD =
                event.getTokenIn().tokenID === pair.firstToken.identifier
                    ? computeValueUSD(
                          feeAmount,
                          pair.firstToken.decimals,
                          pair.firstTokenPriceUSD,
                      )
                    : computeValueUSD(
                          feeAmount,
                          pair.secondToken.decimals,
                          pair.secondTokenPriceUSD,
                      );
        } else if (
            commonTokenIDs.includes(pair.firstToken.identifier) &&
            !commonTokenIDs.includes(pair.secondToken.identifier)
        ) {
            volumeUSD = firstTokenVolumeUSD;

            if (event.getTokenIn().tokenID === pair.secondToken.identifier) {
                feeAmount = this.pairPersistence
                    .getEquivalentForLiquidity(
                        pair,
                        pair.secondToken.identifier,
                        feeAmount,
                    )
                    .toFixed();
            }

            feesUSD = computeValueUSD(
                feeAmount,
                pair.firstToken.decimals,
                pair.firstTokenPriceUSD,
            );
        } else if (
            !commonTokenIDs.includes(pair.firstToken.identifier) &&
            commonTokenIDs.includes(pair.secondToken.identifier)
        ) {
            volumeUSD = secondTokenVolumeUSD;

            if (event.getTokenIn().tokenID === pair.firstToken.identifier) {
                feeAmount = this.pairPersistence
                    .getEquivalentForLiquidity(
                        pair,
                        pair.firstToken.identifier,
                        feeAmount,
                    )
                    .toFixed();
            }

            feesUSD = computeValueUSD(
                feeAmount,
                pair.secondToken.decimals,
                pair.secondTokenPriceUSD,
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
            liquidity: pair.info.totalSupply,
            volumeUSD: volumeUSD.toFixed(),
            feesUSD: feesUSD.dividedBy(usdcPrice).toFixed(),
        };

        const { firstTokenTotalLockedValue, secondTokenTotalLockedValue } =
            await this.getPairTokensTotalLockedValue(pair);

        data[pair.firstToken.identifier] = {
            lockedValue: firstTokenTotalLockedValue,
            lockedValueUSD: computeValueUSD(
                firstTokenTotalLockedValue,
                pair.firstToken.decimals,
                pair.firstTokenPriceUSD,
            )
                .dividedBy(usdcPrice)
                .toFixed(),
            priceUSD: new BigNumber(pair.firstTokenPriceUSD)
                .dividedBy(usdcPrice)
                .toFixed(),
            volume: firstTokenAmount,
            volumeUSD: firstTokenVolumeUSD.toFixed(),
        };

        data[pair.secondToken.identifier] = {
            lockedValue: secondTokenTotalLockedValue,
            lockedValueUSD: computeValueUSD(
                secondTokenTotalLockedValue,
                pair.secondToken.decimals,
                pair.secondTokenPriceUSD,
            )
                .dividedBy(usdcPrice)
                .toFixed(),
            priceUSD: new BigNumber(pair.secondTokenPriceUSD)
                .dividedBy(usdcPrice)
                .toFixed(),
            volume: secondTokenAmount,
            volumeUSD: secondTokenVolumeUSD.toFixed(),
        };

        data['factory'] = {
            totalLockedValueUSD: new BigNumber(newTotalLockedValueUSD)
                .dividedBy(usdcPrice)
                .toFixed(),
        };

        profiler.stop();

        console.log(
            `Persistence swap event handler finished in ${profiler.duration}`,
        );

        return data;
    }

    async updatePairReservesAndPrices(
        pair: PairDocument,
        firstTokenReserves: string,
        secondTokenReserves: string,
        usdcPrice: number,
        totalSupply?: string,
    ): Promise<void> {
        pair.info.reserves0 = firstTokenReserves;
        pair.info.reserves1 = secondTokenReserves;
        pair.info.totalSupply = totalSupply
            ? totalSupply
            : pair.info.totalSupply;

        const { firstTokenPrice, secondTokenPrice } =
            this.pairPersistence.computeTokensPrice(pair);

        pair.firstTokenPrice = firstTokenPrice;
        pair.secondTokenPrice = secondTokenPrice;

        console.log({
            address: pair.address,
            firstTokenReserves,
            secondTokenReserves,
            firstTokenPrice,
            secondTokenPrice,
        });

        await pair.save();

        await this.tokenPersistence.bulkUpdatePairTokensPrice(usdcPrice);
        // return pair;
    }

    async updatePairLiquidityValuesUSD(
        pair: PairDocument,
        usdcPrice: number,
        commonTokenIDs: string[],
    ): Promise<void> {
        const liquidityValues =
            await this.pairPersistence.computeLiquidityValuesUSD(
                pair,
                usdcPrice,
                commonTokenIDs,
                true,
            );

        // console.log(liquidityValues);

        pair.firstTokenPriceUSD = liquidityValues.firstTokenPriceUSD;
        pair.firstTokenLockedValueUSD =
            liquidityValues.firstTokenLockedValueUSD;
        pair.secondTokenPriceUSD = liquidityValues.secondTokenPriceUSD;
        pair.secondTokenLockedValueUSD =
            liquidityValues.secondTokenLockedValueUSD;
        pair.lockedValueUSD = liquidityValues.lockedValueUSD;
        pair.liquidityPoolTokenPriceUSD =
            liquidityValues.liquidityPoolTokenPriceUSD;

        await pair.save();

        await this.tokenPersistence.bulkUpdatePairTokensLiquidityUSD(
            commonTokenIDs,
        );
        // return pair;
    }

    async getPairTokensTotalLockedValue(currentPair: PairDocument): Promise<{
        firstTokenTotalLockedValue: string;
        secondTokenTotalLockedValue: string;
    }> {
        const pairs = await this.pairPersistence.getFilteredPairs(
            {
                $or: [
                    {
                        firstTokenId: {
                            $in: [
                                currentPair.firstToken.identifier,
                                currentPair.secondToken.identifier,
                            ],
                        },
                    },
                    {
                        secondTokenId: {
                            $in: [
                                currentPair.firstToken.identifier,
                                currentPair.secondToken.identifier,
                            ],
                        },
                    },
                ],
            },
            {
                info: 1,
                firstTokenId: 1,
                secondTokenId: 1,
            },
        );

        let firstTokenTVL = new BigNumber(0);
        let secondTokenTVL = new BigNumber(0);

        pairs.forEach((pair) => {
            switch (currentPair.firstToken.identifier) {
                case pair.firstTokenId:
                    firstTokenTVL = firstTokenTVL.plus(pair.info.reserves0);
                    break;
                case pair.secondTokenId:
                    firstTokenTVL = firstTokenTVL.plus(pair.info.reserves1);
                    break;
            }

            switch (currentPair.secondToken.identifier) {
                case pair.firstTokenId:
                    secondTokenTVL = secondTokenTVL.plus(pair.info.reserves0);
                    break;
                case pair.secondTokenId:
                    secondTokenTVL = secondTokenTVL.plus(pair.info.reserves1);
                    break;
            }
        });

        return {
            firstTokenTotalLockedValue: firstTokenTVL.toFixed(),
            secondTokenTotalLockedValue: secondTokenTVL.toFixed(),
        };
    }
}
