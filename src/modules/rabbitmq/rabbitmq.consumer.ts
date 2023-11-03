import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { FarmHandlerService } from './handlers/farm.handler.service';
import { RabbitMQProxyHandlerService } from './rabbitmq.proxy.handler.service';
import { CompetingRabbitConsumer } from './rabbitmq.consumers';
import { scAddress } from 'src/config';
import { RabbitMQEsdtTokenHandlerService } from './rabbitmq.esdtToken.handler.service';
import { farmsAddresses } from 'src/utils/farm.utils';
import { RouterHandlerService } from './handlers/router.handler.service';
import { RabbitMQMetabondingHandlerService } from './rabbitmq.metabonding.handler.service';
import { PriceDiscoveryEventHandler } from './handlers/price.discovery.handler.service';
import {
    AddLiquidityEvent,
    AddLiquidityProxyEvent,
    ClaimMultiEvent,
    ClaimRewardsProxyEvent,
    CompoundRewardsProxyEvent,
    CreatePairEvent,
    DepositEvent,
    DepositSwapFeesEvent,
    EnergyEvent,
    EnterFarmProxyEvent,
    ESCROW_EVENTS,
    EscrowCancelTransferEvent,
    EscrowLockFundsEvent,
    EscrowWithdrawEvent,
    EsdtLocalBurnEvent,
    EsdtLocalMintEvent,
    ExitFarmProxyEvent,
    FARM_EVENTS,
    FEES_COLLECTOR_EVENTS,
    GOVERNANCE_EVENTS,
    METABONDING_EVENTS,
    MetabondingEvent,
    PAIR_EVENTS,
    PairProxyEvent,
    PairSwapEnabledEvent,
    PRICE_DISCOVERY_EVENTS,
    PROXY_EVENTS,
    RawEvent,
    RemoveLiquidityEvent,
    ROUTER_EVENTS,
    SIMPLE_LOCK_ENERGY_EVENTS,
    SwapEvent,
    TOKEN_UNSTAKE_EVENTS,
    TRANSACTION_EVENTS,
    UpdateGlobalAmountsEvent,
    UpdateUserEnergyEvent,
    UserUnlockedTokensEvent,
    VoteEvent,
    WEEKLY_REWARDS_SPLITTING_EVENTS,
    WithdrawEvent,
} from '@multiversx/sdk-exchange';
import { LiquidityHandler } from './handlers/pair.liquidity.handler.service';
import { SwapEventHandler } from './handlers/pair.swap.handler.service';
import BigNumber from 'bignumber.js';
import { EnergyHandler } from './handlers/energy.handler.service';
import { FeesCollectorHandlerService } from './handlers/feesCollector.handler.service';
import { WeeklyRewardsSplittingHandlerService } from './handlers/weeklyRewardsSplitting.handler.service';
import { TokenUnstakeHandlerService } from './handlers/token.unstake.handler.service';
import { AnalyticsWriteService } from 'src/services/analytics/services/analytics.write.service';
import { RouterAbiService } from '../router/services/router.abi.service';
import { EscrowHandlerService } from './handlers/escrow.handler.service';
import { governanceContractsAddresses } from '../../utils/governance';
import { GovernanceHandlerService } from './handlers/governance.handler.service';
import { RemoteConfigGetterService } from '../remote-config/remote-config.getter.service';
import { StakingHandlerService } from './handlers/staking.handler.service';

@Injectable()
export class RabbitMqConsumer {
    private filterAddresses: string[];
    private data: any[];

    constructor(
        private readonly routerAbi: RouterAbiService,
        private readonly liquidityHandler: LiquidityHandler,
        private readonly swapHandler: SwapEventHandler,
        private readonly wsFarmHandler: FarmHandlerService,
        private readonly stakingHandler: StakingHandlerService,
        private readonly wsProxyHandler: RabbitMQProxyHandlerService,
        private readonly routerHandler: RouterHandlerService,
        private readonly wsEsdtTokenHandler: RabbitMQEsdtTokenHandlerService,
        private readonly wsMetabondingHandler: RabbitMQMetabondingHandlerService,
        private readonly priceDiscoveryHandler: PriceDiscoveryEventHandler,
        private readonly energyHandler: EnergyHandler,
        private readonly feesCollectorHandler: FeesCollectorHandlerService,
        private readonly weeklyRewardsSplittingHandler: WeeklyRewardsSplittingHandlerService,
        private readonly tokenUnstakeHandler: TokenUnstakeHandlerService,
        private readonly escrowHandler: EscrowHandlerService,
        private readonly analyticsWrite: AnalyticsWriteService,
        private readonly governanceHandler: GovernanceHandlerService,
        private readonly remoteConfig: RemoteConfigGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @CompetingRabbitConsumer({
        queueName: process.env.RABBITMQ_QUEUE,
        exchange: process.env.RABBITMQ_EXCHANGE,
    })
    async consumeEvents(rawEvents: any) {
        this.logger.info('Start Processing events...');
        if (!rawEvents.events) {
            return;
        }
        const events: RawEvent[] = rawEvents?.events
            ?.filter(
                (rawEvent: { address: string; identifier: string }) =>
                    rawEvent.identifier ===
                        TRANSACTION_EVENTS.ESDT_LOCAL_BURN ||
                    rawEvent.identifier ===
                        TRANSACTION_EVENTS.ESDT_LOCAL_MINT ||
                    this.isFilteredAddress(rawEvent.address),
            )
            .map((rawEventType) => new RawEvent(rawEventType));

        this.data = [];
        let timestamp: number;

        for (const rawEvent of events) {
            if (
                rawEvent.data === '' &&
                rawEvent.name !== METABONDING_EVENTS.UNBOND &&
                rawEvent.name !==
                    WEEKLY_REWARDS_SPLITTING_EVENTS.UPDATE_GLOBAL_AMOUNTS &&
                rawEvent.name !==
                    WEEKLY_REWARDS_SPLITTING_EVENTS.UPDATE_USER_ENERGY &&
                rawEvent.name !== TOKEN_UNSTAKE_EVENTS.USER_UNLOCKED_TOKENS &&
                rawEvent.name !== GOVERNANCE_EVENTS.UP &&
                rawEvent.name !== GOVERNANCE_EVENTS.DOWN &&
                rawEvent.name !== GOVERNANCE_EVENTS.ABSTAIN &&
                rawEvent.name !== GOVERNANCE_EVENTS.DOWN_VETO
            ) {
                this.logger.info('Event skipped', {
                    address: rawEvent.address,
                    identifier: rawEvent.identifier,
                    name: rawEvent.name,
                    topics: rawEvent.topics,
                });
                continue;
            }
            this.logger.info('Processing event', {
                address: rawEvent.address,
                identifier: rawEvent.identifier,
                name: rawEvent.name,
                topics: rawEvent.topics,
            });
            let eventData: any[];
            switch (rawEvent.name) {
                case PAIR_EVENTS.SWAP:
                    [eventData, timestamp] =
                        await this.swapHandler.handleSwapEvents(
                            new SwapEvent(rawEvent),
                        );
                    this.updateIngestData(eventData);
                    break;
                case PAIR_EVENTS.ADD_LIQUIDITY:
                    [eventData, timestamp] =
                        await this.liquidityHandler.handleLiquidityEvent(
                            new AddLiquidityEvent(rawEvent),
                        );
                    this.updateIngestData(eventData);
                    break;
                case PAIR_EVENTS.REMOVE_LIQUIDITY:
                    [eventData, timestamp] =
                        await this.liquidityHandler.handleLiquidityEvent(
                            new RemoveLiquidityEvent(rawEvent),
                        );
                    this.updateIngestData(eventData);
                    break;
                case FARM_EVENTS.ENTER_FARM:
                    if (await this.isStakingAddress(rawEvent.address)) {
                        await this.stakingHandler.handleStakeEvent(rawEvent);
                    } else {
                        await this.wsFarmHandler.handleEnterFarmEvent(rawEvent);
                    }
                    break;
                case FARM_EVENTS.EXIT_FARM:
                    if (await this.isStakingAddress(rawEvent.address)) {
                        await this.stakingHandler.handleUnstakeEvent(rawEvent);
                    } else {
                        await this.wsFarmHandler.handleExitFarmEvent(rawEvent);
                    }
                    break;
                case FARM_EVENTS.CLAIM_REWARDS:
                    if (await this.isStakingAddress(rawEvent.address)) {
                        await this.stakingHandler.handleClaimRewardsEvent(
                            rawEvent,
                        );
                    } else {
                        await this.wsFarmHandler.handleRewardsEvent(rawEvent);
                    }
                    break;
                case FARM_EVENTS.COMPOUND_REWARDS:
                    await this.wsFarmHandler.handleRewardsEvent(rawEvent);
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
                case TRANSACTION_EVENTS.ESDT_LOCAL_MINT:
                    await this.wsEsdtTokenHandler.handleEsdtTokenEvent(
                        new EsdtLocalMintEvent(rawEvent),
                    );
                    break;
                case TRANSACTION_EVENTS.ESDT_LOCAL_BURN:
                    await this.wsEsdtTokenHandler.handleEsdtTokenEvent(
                        new EsdtLocalBurnEvent(rawEvent),
                    );
                    break;
                case ROUTER_EVENTS.CREATE_PAIR:
                    await this.routerHandler.handleCreatePairEvent(
                        new CreatePairEvent(rawEvent),
                    );
                    await this.getFilterAddresses();
                    break;
                case ROUTER_EVENTS.PAIR_SWAP_ENABLED:
                    await this.routerHandler.handlePairSwapEnabledEvent(
                        new PairSwapEnabledEvent(rawEvent),
                    );
                    break;
                case METABONDING_EVENTS.STAKE_LOCKED_ASSET:
                    await this.wsMetabondingHandler.handleMetabondingEvent(
                        new MetabondingEvent(rawEvent),
                    );
                    break;
                case METABONDING_EVENTS.UNSTAKE:
                    await this.wsMetabondingHandler.handleMetabondingEvent(
                        new MetabondingEvent(rawEvent),
                    );
                    break;
                case METABONDING_EVENTS.UNBOND:
                    await this.wsMetabondingHandler.handleMetabondingEvent(
                        new MetabondingEvent(rawEvent),
                    );
                    break;
                case PRICE_DISCOVERY_EVENTS.DEPOSIT:
                    [eventData, timestamp] =
                        await this.priceDiscoveryHandler.handleEvent(
                            new DepositEvent(rawEvent),
                        );
                    this.updateIngestData(eventData);
                    break;
                case PRICE_DISCOVERY_EVENTS.WITHDARW:
                    [eventData, timestamp] =
                        await this.priceDiscoveryHandler.handleEvent(
                            new WithdrawEvent(rawEvent),
                        );
                    this.updateIngestData(eventData);
                    break;
                case SIMPLE_LOCK_ENERGY_EVENTS.ENERGY_UPDATED:
                    await this.energyHandler.handleUpdateEnergy(
                        new EnergyEvent(rawEvent),
                    );
                    break;
                case FEES_COLLECTOR_EVENTS.DEPOSIT_SWAP_FEES:
                    await this.feesCollectorHandler.handleDepositSwapFeesEvent(
                        new DepositSwapFeesEvent(rawEvent),
                    );
                    break;
                case WEEKLY_REWARDS_SPLITTING_EVENTS.UPDATE_GLOBAL_AMOUNTS:
                    await this.weeklyRewardsSplittingHandler.handleUpdateGlobalAmounts(
                        new UpdateGlobalAmountsEvent(rawEvent),
                    );
                    break;
                case WEEKLY_REWARDS_SPLITTING_EVENTS.UPDATE_USER_ENERGY:
                    await this.weeklyRewardsSplittingHandler.handleUpdateUserEnergy(
                        new UpdateUserEnergyEvent(rawEvent),
                    );
                    break;
                case WEEKLY_REWARDS_SPLITTING_EVENTS.CLAIM_MULTI:
                    await this.weeklyRewardsSplittingHandler.handleClaimMulti(
                        new ClaimMultiEvent(rawEvent),
                    );
                    break;
                case TOKEN_UNSTAKE_EVENTS.USER_UNLOCKED_TOKENS:
                    await this.tokenUnstakeHandler.handleUnlockedTokens(
                        new UserUnlockedTokensEvent(rawEvent),
                    );
                    break;
                case ESCROW_EVENTS.LOCK_FUNDS:
                    await this.escrowHandler.handleEscrowLockFundsEvent(
                        new EscrowLockFundsEvent(rawEvent),
                    );
                    break;
                case ESCROW_EVENTS.WITHDRAW:
                    await this.escrowHandler.handleEscrowWithdrawEvent(
                        new EscrowWithdrawEvent(rawEvent),
                    );
                    break;
                case ESCROW_EVENTS.CANCEL_TRANSFER:
                    await this.escrowHandler.handleEscrowCancelTransferEvent(
                        new EscrowCancelTransferEvent(rawEvent),
                    );
                    break;
                case GOVERNANCE_EVENTS.UP:
                case GOVERNANCE_EVENTS.DOWN:
                case GOVERNANCE_EVENTS.DOWN_VETO:
                case GOVERNANCE_EVENTS.ABSTAIN:
                    await this.governanceHandler.handleGovernanceVoteEvent(
                        new VoteEvent(rawEvent),
                        rawEvent.name,
                    );
                    break;
            }
        }

        if (Object.keys(this.data).length > 0) {
            await this.analyticsWrite.ingest({
                data: this.data,
                Time: timestamp,
            });
        }
        this.logger.info('Finish Processing events...');
    }

    async getFilterAddresses(): Promise<void> {
        this.filterAddresses = [];
        this.filterAddresses = await this.routerAbi.getAllPairsAddressRaw();
        this.filterAddresses.push(...farmsAddresses());
        this.filterAddresses.push(scAddress.routerAddress);
        this.filterAddresses.push(scAddress.metabondingStakingAddress);
        this.filterAddresses.push(...scAddress.priceDiscovery);
        this.filterAddresses.push(scAddress.simpleLockEnergy);
        this.filterAddresses.push(scAddress.feesCollector);
        this.filterAddresses.push(scAddress.tokenUnstake);
        this.filterAddresses.push(scAddress.escrow);
        this.filterAddresses.push(...governanceContractsAddresses());

        const stakeAddresses = await this.remoteConfig.getStakingAddresses();
        this.filterAddresses.push(...stakeAddresses);
    }

    private isFilteredAddress(address: string): boolean {
        return (
            this.filterAddresses.find(
                (filterAddress) => address === filterAddress,
            ) !== undefined
        );
    }

    private async isStakingAddress(address: string): Promise<boolean> {
        const stakeAddresses = await this.remoteConfig.getStakingAddresses();
        return (
            stakeAddresses.find((stakeAddress) => address === stakeAddress) !==
            undefined
        );
    }

    private async updateIngestData(eventData: any[]): Promise<void> {
        for (const series of Object.keys(eventData)) {
            if (this.data[series] === undefined) {
                this.data[series] = {};
            }
            for (const measure of Object.keys(eventData[series])) {
                if (
                    measure.toLowerCase().includes('volume') ||
                    measure.toLowerCase().includes('fees')
                ) {
                    this.data[series][measure] = this.data[series][measure]
                        ? new BigNumber(this.data[series][measure])
                              .plus(eventData[series][measure])
                              .toFixed()
                        : eventData[series][measure];
                } else {
                    this.data[series][measure] = eventData[series][measure];
                }
            }
        }
    }
}
