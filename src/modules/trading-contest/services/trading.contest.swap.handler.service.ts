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
import {
    MultiPairSwapEvent,
    ROUTER_EVENTS,
    SwapEvent,
} from '@multiversx/sdk-exchange';

type EventFields = {
    swapType: SWAP_TYPE;
    txHash: string;
    address: string;
    caller: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
};

enum SWAP_TYPE {
    FIXED_INPUT,
    FIXED_OUTPUT,
    MULTI_PAIR,
}

@Injectable()
export class TradingContestSwapHandlerService {
    constructor(
        private readonly tradingContestService: TradingContestService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleSwapEvent(
        event: SwapEvent | MultiPairSwapEvent,
        swapData: SwapEventPairData,
    ): Promise<void> {
        const activeContests =
            await this.tradingContestService.getActiveContests();

        if (!activeContests || activeContests.length === 0) {
            return;
        }

        let sender: string;
        try {
            sender = await this.getSenderFromEvent(event);
        } catch (error) {
            this.logger.warn(error.message, {
                context: TradingContestSwapHandlerService.name,
            });
            return;
        }

        const {
            txHash,
            swapType,
            address,
            caller,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
        } = this.extractEventFields(event);

        for (const contest of activeContests) {
            const isValidSwap = await this.isValidContestSwap(
                contest,
                address,
                caller,
                swapType,
                tokenIn,
                tokenOut,
                txHash,
                swapData.volumeUSD,
            );

            if (!isValidSwap) {
                continue;
            }

            const contestSwap: TradingContestSwap = {
                contest: contest._id,
                txHash: txHash,
                pairAddress: address,
                swapType,
                volumeUSD: new BigNumber(swapData.volumeUSD).toNumber(),
                feesUSD: new BigNumber(swapData.feesUSD).toNumber(),
                tokenIn,
                amountIn,
                tokenOut,
                amountOut,
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

    private async getSenderFromEvent(
        event: SwapEvent | MultiPairSwapEvent,
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
        eventAddress: string,
        callerAddress: string,
        swapType: SWAP_TYPE,
        tokenIn: string,
        tokenOut: string,
        txHash: string,
        volumeUSD: string,
    ): Promise<boolean> {
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

        if (
            contest.pairAddresses.length > 0 &&
            contest.pairAddresses.includes(eventAddress)
        ) {
            return true;
        }

        if (
            contest.pairAddresses.length === 0 &&
            swapType !== SWAP_TYPE.MULTI_PAIR &&
            callerAddress === scAddress.routerAddress
        ) {
            this.logger.info(
                `Swap (tx ${txHash}) is intermediary and not accepted for contest ${contest._id}`,
                { context: TradingContestSwapHandlerService.name },
            );
            return false;
        }

        if (contest.tokensPair.length > 0) {
            if (
                (tokenIn === contest.tokensPair[0] &&
                    tokenOut === contest.tokensPair[1]) ||
                (tokenIn === contest.tokensPair[1] &&
                    tokenOut === contest.tokensPair[0])
            ) {
                return true;
            }
        }

        if (
            contest.tokens.length > 0 &&
            (contest.tokens.includes(tokenIn) ||
                contest.tokens.includes(tokenOut))
        ) {
            return true;
        }

        return false;
    }

    private extractEventFields(
        event: SwapEvent | MultiPairSwapEvent,
    ): EventFields {
        const txHash =
            (event as ExtendedSwapEvent).originalTxHash ??
            (event as ExtendedSwapEvent).txHash;
        const address = event.address;
        const caller = event.getTopics().caller;

        if (event.identifier === ROUTER_EVENTS.MULTI_PAIR_SWAP) {
            const multiPairSwapEvent = event as MultiPairSwapEvent;

            return {
                address,
                caller,
                swapType: SWAP_TYPE.MULTI_PAIR,
                txHash,
                tokenIn: multiPairSwapEvent.getTopics().tokenInID,
                amountIn: multiPairSwapEvent.getTopics().amountIn,
                tokenOut: multiPairSwapEvent.getTopics().tokenOutID,
                amountOut: multiPairSwapEvent.getTopics().amountOut,
            };
        }

        const swapEvent = event as SwapEvent;

        return {
            address,
            caller,
            swapType:
                swapEvent.identifier === SWAP_IDENTIFIER.SWAP_FIXED_INPUT
                    ? SWAP_TYPE.FIXED_INPUT
                    : SWAP_TYPE.FIXED_OUTPUT,
            txHash,
            tokenIn: swapEvent.getTokenIn().tokenID,
            amountIn: swapEvent.getTokenIn().amount.toFixed(),
            tokenOut: swapEvent.getTokenOut().tokenID,
            amountOut: swapEvent.getTokenOut().amount.toFixed(),
        };
    }
}
