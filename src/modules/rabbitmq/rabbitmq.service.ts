import { Inject } from '@nestjs/common';
import { EnterFarmEvent } from './entities/farm/enterFarm.event';
import { ExitFarmEvent } from './entities/farm/exitFarm.event';
import { RewardsEvent } from './entities/farm/rewards.event';
import { AddLiquidityEvent } from './entities/pair/addLiquidity.event';
import { RemoveLiquidityEvent } from './entities/pair/removeLiquidity.event';
import { SwapFixedInputEvent } from './entities/pair/swapFixedInput.event';
import { SwapNoFeeEvent } from './entities/pair/swapNoFee.event';
import { AddLiquidityProxyEvent } from './entities/proxy/addLiquidityProxy.event';
import { ClaimRewardsProxyEvent } from './entities/proxy/claimRewardsProxy.event';
import { CompoundRewardsProxyEvent } from './entities/proxy/compoundRewardsProxy.event';
import { EnterFarmProxyEvent } from './entities/proxy/enterFarmProxy.event';
import { ExitFarmProxyEvent } from './entities/proxy/exitFarmProxy.event';
import { PairProxyEvent } from './entities/proxy/pairProxy.event';
import { ContextService } from 'src/services/context/context.service';
import {
    FARM_EVENTS,
    PAIR_EVENTS,
    PROXY_EVENTS,
} from './entities/generic.types';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RabbitMQPairHandlerService } from './rabbitmq.pair.handler.service';
import { SwapFixedOutputEvent } from './entities/pair/swapFixedOutput.event';
import { RabbitMQFarmHandlerService } from './rabbitmq.farm.handler.service';
import { RabbitMQProxyHandlerService } from './rabbitmq.proxy.handler.service';
import { CompetingRabbitConsumer } from './rabbitmq.consumers';

export class RabbitMqConsumer {
    constructor(
        private readonly context: ContextService,
        private readonly wsPairHandler: RabbitMQPairHandlerService,
        private readonly wsFarmHandler: RabbitMQFarmHandlerService,
        private readonly wsProxyHandler: RabbitMQProxyHandlerService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @CompetingRabbitConsumer({
        queueName: process.env.RABBITMQ_QUEUE,
        exchange: process.env.RABBITMQ_EXCHANGE,
    })
    async handleEvents(events: any): Promise<void> {
        console.log(events);
        for (const rawEvent of events.events) {
            switch (rawEvent.identifier) {
                case PAIR_EVENTS.SWAP_FIXED_INPUT:
                    await this.wsPairHandler.handleSwapEvent(
                        new SwapFixedInputEvent(rawEvent),
                    );
                    break;
                case PAIR_EVENTS.SWAP_FIXED_OUTPUT:
                    await this.wsPairHandler.handleSwapEvent(
                        new SwapFixedOutputEvent(rawEvent),
                    );
                    break;
                case PAIR_EVENTS.ADD_LIQUIDITY:
                    await this.wsPairHandler.handleLiquidityEvent(
                        new AddLiquidityEvent(rawEvent),
                    );
                    break;
                case PAIR_EVENTS.REMOVE_LIQUIDITY:
                    await this.wsPairHandler.handleLiquidityEvent(
                        new RemoveLiquidityEvent(rawEvent),
                    );
                    break;
                case PAIR_EVENTS.SWAP_NO_FEE:
                    await this.wsPairHandler.handleSwapNoFeeEvent(
                        new SwapNoFeeEvent(rawEvent),
                    );
                    break;
                case FARM_EVENTS.ENTER_FARM:
                    await this.wsFarmHandler.handleFarmEvent(
                        new EnterFarmEvent(rawEvent),
                    );
                    break;
                case FARM_EVENTS.EXIT_FARM:
                    await this.wsFarmHandler.handleFarmEvent(
                        new ExitFarmEvent(rawEvent),
                    );
                    break;
                case FARM_EVENTS.CLAIM_REWARDS:
                    await this.wsFarmHandler.handleRewardsEvent(
                        new RewardsEvent(rawEvent),
                    );
                    break;
                case FARM_EVENTS.COMPOUND_REWARDS:
                    await this.wsFarmHandler.handleRewardsEvent(
                        new RewardsEvent(rawEvent),
                    );
                    break;
                case PROXY_EVENTS.ADD_LIQUIDITY_PROXY:
                    await this.wsProxyHandler.handleLiquidityProxyEvent(
                        new AddLiquidityProxyEvent(rawEvent),
                    );
                    break;
                case PROXY_EVENTS.REMOVE_LIQUIDITY_PROXY:
                    await this.wsProxyHandler.handleLiquidityProxyEvent(
                        new PairProxyEvent(rawEvent),
                    );
                    break;
                case PROXY_EVENTS.ENTER_FARM_PROXY:
                    await this.wsProxyHandler.handleFarmProxyEvent(
                        new EnterFarmProxyEvent(rawEvent),
                    );
                    break;
                case PROXY_EVENTS.EXIT_FARM_PROXY:
                    await this.wsProxyHandler.handleFarmProxyEvent(
                        new ExitFarmProxyEvent(rawEvent),
                    );
                    break;
                case PROXY_EVENTS.CLAIM_REWARDS_PROXY:
                    await this.wsProxyHandler.handleRewardsProxyEvent(
                        new ClaimRewardsProxyEvent(rawEvent),
                    );
                    break;
                case PROXY_EVENTS.COMPOUND_REWARDS_PROXY:
                    await this.wsProxyHandler.handleRewardsProxyEvent(
                        new CompoundRewardsProxyEvent(rawEvent),
                    );
                    break;
            }
        }
    }
}
