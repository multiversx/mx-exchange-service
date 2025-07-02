import { Inject, Injectable } from '@nestjs/common';
import { Address } from '@multiversx/sdk-core';
import { Logger } from 'winston';
import { scAddress } from 'src/config';
import { TradingContestService } from './trading.contest.service';
import { TradingContestDocument } from '../schemas/trading.contest.schema';
import { TradingContestSwap } from '../schemas/trading.contest.swap.schema';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { SWAP_IDENTIFIER } from 'src/modules/rabbitmq/handlers/pair.swap.handler.service';
import BigNumber from 'bignumber.js';
import { ExtendedSwapEvent, SwapEventPairData } from '../types';
import { SwapEvent } from '@multiversx/sdk-exchange';

@Injectable()
export class TradingContestSwapHandlerService {
    constructor(
        private readonly tradingContestService: TradingContestService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleSwapEvent(
        swapEvent: SwapEvent,
        swapData: SwapEventPairData,
    ): Promise<void> {
        const event = swapEvent as ExtendedSwapEvent;
        const activeContests =
            await this.tradingContestService.getActiveContests();

        if (!activeContests || activeContests.length === 0) {
            return;
        }

        let sender: string;
        try {
            sender = await this.getSenderFromSwapEvent(event);
        } catch (error) {
            this.logger.warn(error.message, {
                context: TradingContestSwapHandlerService.name,
            });
            return;
        }

        const txHash = event.originalTxHash ?? event.txHash;

        for (const contest of activeContests) {
            const isValidSwap = await this.isValidContestSwap(
                contest,
                event,
                swapData.volumeUSD,
            );

            if (!isValidSwap) {
                continue;
            }

            const contestSwap: TradingContestSwap = {
                contest: contest._id,
                txHash: txHash,
                pairAddress: event.address,
                swapType:
                    event.identifier === SWAP_IDENTIFIER.SWAP_FIXED_INPUT
                        ? 0
                        : 1,
                volumeUSD: new BigNumber(swapData.volumeUSD).toNumber(),
                feesUSD: new BigNumber(swapData.feesUSD).toNumber(),
                tokenIn: event.getTokenIn().tokenID,
                amountIn: event.getTokenIn().amount.toFixed(),
                tokenOut: event.getTokenOut().tokenID,
                amountOut: event.getTokenOut().amount.toFixed(),
                timestamp: event.getTimestamp().toNumber(),
            };

            if (sender !== undefined) {
                const participant =
                    await this.tradingContestService.getOrCreateContestParticipant(
                        contest,
                        sender,
                    );

                if (!participant) {
                    continue;
                }

                contestSwap.participant = participant._id;
            }

            await this.tradingContestService.createContestSwap(contestSwap);
        }
    }

    private async getSenderFromSwapEvent(
        event: ExtendedSwapEvent,
    ): Promise<string | undefined> {
        const sender = Address.newFromBech32(event.getTopics().caller);

        const validScAddresses = [
            scAddress.routerAddress,
            scAddress.composableTasks,
        ];

        if (!sender.isEmpty() && !sender.isSmartContract()) {
            return sender.toBech32();
        }

        if (!validScAddresses.includes(sender.toBech32())) {
            throw new Error(`Invalid sender SC : ${sender.toBech32()}`);
        }

        return undefined;
    }

    private async isValidContestSwap(
        contest: TradingContestDocument,
        event: ExtendedSwapEvent,
        volumeUSD: string,
    ): Promise<boolean> {
        if (contest.pairAddresses.length > 0) {
            if (!contest.pairAddresses.includes(event.address)) {
                return false;
            }
        } else {
            const { tokenID: tokenIn } = event.getTokenIn();
            const { tokenID: tokenOut } = event.getTokenOut();

            if (
                !contest.tokens.includes(tokenIn) &&
                !contest.tokens.includes(tokenOut)
            ) {
                return false;
            }
        }

        const txHash = event.originalTxHash ?? event.txHash;

        if (new BigNumber(volumeUSD).lt(contest.minSwapAmountUSD)) {
            this.logger.info(
                `Swap (tx ${txHash}) volume of ${volumeUSD} USD does not meet the minimum requirement for contest ${contest._id}`,
                { context: TradingContestSwapHandlerService.name },
            );
            return false;
        }

        const existingSwap =
            await this.tradingContestService.getContestSwapByHash(
                contest,
                txHash,
            );

        if (existingSwap) {
            this.logger.info(
                `Swap (tx ${txHash}) already persisted for contest ${contest._id}`,
                { context: TradingContestSwapHandlerService.name },
            );
            return false;
        }

        return true;
    }
}
