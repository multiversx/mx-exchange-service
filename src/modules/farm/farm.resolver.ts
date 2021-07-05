import { FarmService } from './farm.service';
import { Resolver, Query, ResolveField, Parent, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import {
    FarmModel,
    FarmTokenAttributesModel,
    RewardsModel,
} from '../../models/farm.model';
import { TransactionsFarmService } from './transactions-farm.service';
import {
    CalculateRewardsArgs,
    ClaimRewardsArgs,
    EnterFarmArgs,
    EnterFarmBatchArgs,
    ExitFarmArgs,
} from './dto/farm.args';
import { FarmStatisticsService } from './farm-statistics.service';
import { TokenMergingTransactionsService } from '../token-merging/token.merging.transactions.service';
import { TokenMergingService } from '../token-merging/token.merging.service';
import {
    DepositTokenArgs,
    SmartContractType,
} from '../token-merging/dto/token.merging.args';

@Resolver(of => FarmModel)
export class FarmResolver {
    constructor(
        @Inject(FarmService) private readonly farmService: FarmService,
        @Inject(TransactionsFarmService)
        private readonly transactionsService: TransactionsFarmService,
        @Inject(TokenMergingTransactionsService)
        private readonly mergeTokensTransactions: TokenMergingTransactionsService,
        @Inject(TokenMergingService)
        private readonly mergeTokensService: TokenMergingService,
        private readonly statisticsService: FarmStatisticsService,
    ) {}

    @ResolveField()
    async farmedToken(@Parent() parent: FarmModel) {
        return await this.farmService.getFarmedToken(parent.address);
    }

    @ResolveField()
    async farmToken(@Parent() parent: FarmModel) {
        return await this.farmService.getFarmToken(parent.address);
    }

    @ResolveField()
    async farmingToken(@Parent() parent: FarmModel) {
        return await this.farmService.getFarmingToken(parent.address);
    }

    @ResolveField()
    async perBlockRewards(@Parent() parent: FarmModel) {
        return await this.farmService.getRewardsPerBlock(parent.address);
    }

    @ResolveField()
    async farmTokenSupply(@Parent() parent: FarmModel) {
        return await this.farmService.getFarmTokenSupply(parent.address);
    }

    @ResolveField()
    async farmingTokenReserve(@Parent() parent: FarmModel) {
        return await this.farmService.getFarmingTokenReserve(parent.address);
    }

    @ResolveField()
    async farmedTokenPriceUSD(@Parent() parent: FarmModel) {
        return await this.farmService.getFarmedTokenPriceUSD(parent.address);
    }

    @ResolveField()
    async farmTokenPriceUSD(@Parent() parent: FarmModel) {
        return await this.farmService.getFarmTokenPriceUSD(parent.address);
    }

    @ResolveField()
    async farmingTokenPriceUSD(@Parent() parent: FarmModel) {
        return await this.farmService.getFarmingTokenPriceUSD(parent.address);
    }

    @ResolveField()
    async APR(@Parent() parent: FarmModel) {
        return await this.statisticsService.computeFarmAPR(parent.address);
    }

    @ResolveField()
    async nftDepositMaxLen(@Parent() parent: FarmModel) {
        return await this.mergeTokensService.getNftDepositMaxLen({
            smartContractType: SmartContractType.FARM,
            address: parent.address,
        });
    }

    @ResolveField(type => [String])
    async nftDepositAcceptedTokenIDs(@Parent() parent: FarmModel) {
        return await this.mergeTokensService.getNftDepositAcceptedTokenIDs({
            smartContractType: SmartContractType.FARM,
            address: parent.address,
        });
    }

    @ResolveField()
    async state(@Parent() parent: FarmModel) {
        return await this.farmService.getState(parent.address);
    }

    @Query(returns => FarmTokenAttributesModel)
    async farmTokenAttributes(
        @Args('identifier') identifier: string,
        @Args('attributes') attributes: string,
    ): Promise<FarmTokenAttributesModel> {
        return this.farmService.decodeFarmTokenAttributes(
            identifier,
            attributes,
        );
    }

    @Query(returns => [FarmModel])
    async farms(): Promise<FarmModel[]> {
        return this.farmService.getFarms();
    }

    @Query(returns => RewardsModel)
    async getRewardsForPosition(
        @Args() args: CalculateRewardsArgs,
    ): Promise<RewardsModel> {
        return await this.farmService.getRewardsForPosition(args);
    }

    @Query(returns => TransactionModel)
    async enterFarm(@Args() args: EnterFarmArgs): Promise<TransactionModel> {
        return await this.transactionsService.enterFarm(args);
    }

    @Query(returns => [TransactionModel])
    async enterFarmBatch(
        @Args() enterFarmBatchArgs: EnterFarmBatchArgs,
    ): Promise<TransactionModel[]> {
        const depositTokenArgs: DepositTokenArgs = {
            smartContractType: SmartContractType.FARM,
            address: enterFarmBatchArgs.farmAddress,
            tokenID: enterFarmBatchArgs.farmTokenID,
            tokenNonce: enterFarmBatchArgs.farmTokenNonce,
            amount: enterFarmBatchArgs.amount,
            sender: enterFarmBatchArgs.sender,
        };
        const enterFarmArgs: EnterFarmArgs = {
            tokenInID: enterFarmBatchArgs.tokenInID,
            farmAddress: enterFarmBatchArgs.farmAddress,
            amount: enterFarmBatchArgs.amountIn,
            lockRewards: enterFarmBatchArgs.lockRewards,
        };

        return await Promise.all([
            this.mergeTokensTransactions.depositToken(depositTokenArgs),
            this.transactionsService.enterFarm(enterFarmArgs),
        ]);
    }

    @Query(returns => TransactionModel)
    async exitFarm(@Args() args: ExitFarmArgs): Promise<TransactionModel> {
        return await this.transactionsService.exitFarm(args);
    }

    @Query(returns => TransactionModel)
    async claimRewards(
        @Args() args: ClaimRewardsArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsService.claimRewards(args);
    }
}
