import { FarmService } from './services/farm.service';
import { Resolver, Query, ResolveField, Parent, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import {
    ExitFarmTokensModel,
    FarmModel,
    RewardsModel,
} from './models/farm.model';
import { TransactionsFarmService } from './services/transactions-farm.service';
import {
    BatchFarmRewardsComputeArgs,
    CalculateRewardsArgs,
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    EnterFarmBatchArgs,
    ExitFarmArgs,
} from './models/farm.args';
import { FarmStatisticsService } from './services/farm-statistics.service';
import { TokenMergingTransactionsService } from '../token-merging/token.merging.transactions.service';
import { TokenMergingService } from '../token-merging/token.merging.service';
import {
    TokensMergingArgs,
    DepositTokenArgs,
    SmartContractType,
} from '../token-merging/dto/token.merging.args';
import { ApolloError } from 'apollo-server-express';
import { FarmTokenAttributesModel } from './models/farmTokenAttributes.model';
import { FarmGetterService } from './services/farm.getter.service';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { User } from 'src/helpers/userDecorator';

@Resolver(of => FarmModel)
export class FarmResolver {
    constructor(
        private readonly farmService: FarmService,
        private readonly farmGetterService: FarmGetterService,
        private readonly transactionsService: TransactionsFarmService,
        private readonly mergeTokensTransactions: TokenMergingTransactionsService,
        private readonly mergeTokensService: TokenMergingService,
        private readonly statisticsService: FarmStatisticsService,
    ) {}

    @ResolveField()
    async farmedToken(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmedToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmToken(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmingToken(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmingToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async perBlockRewards(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getRewardsPerBlock(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmTokenSupply(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmTokenSupply(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmingTokenReserve(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmingTokenReserve(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmedTokenPriceUSD(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmedTokenPriceUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmTokenPriceUSD(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmTokenPriceUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmingTokenPriceUSD(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmingTokenPriceUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async penaltyPercent(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getPenaltyPercent(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async minimumFarmingEpochs(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getMinimumFarmingEpochs(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async rewardPerShare(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getRewardPerShare(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lastRewardBlockNonce(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getLastRewardBlockNonce(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async undistributedFees(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getUndistributedFees(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async currentBlockFee(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getCurrentBlockFee(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async divisionSafetyConstant(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getDivisionSafetyConstant(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async APR(@Parent() parent: FarmModel) {
        try {
            return await this.statisticsService.getFarmAPR(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async nftDepositMaxLen(@Parent() parent: FarmModel) {
        try {
            return await this.mergeTokensService.getNftDepositMaxLen({
                smartContractType: SmartContractType.FARM,
                address: parent.address,
            });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(type => [String])
    async nftDepositAcceptedTokenIDs(@Parent() parent: FarmModel) {
        try {
            return await this.mergeTokensService.getNftDepositAcceptedTokenIDs({
                smartContractType: SmartContractType.FARM,
                address: parent.address,
            });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async state(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getState(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
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

    @UseGuards(GqlAuthGuard)
    @Query(returns => [RewardsModel])
    async getRewardsForPosition(
        @Args('farmsPositions') args: BatchFarmRewardsComputeArgs,
    ): Promise<RewardsModel[]> {
        try {
            return this.farmService.getBatchRewardsForPosition(
                args.farmsPositions,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => ExitFarmTokensModel)
    async getExitFarmTokens(
        @Args('args') args: CalculateRewardsArgs,
    ): Promise<ExitFarmTokensModel> {
        return this.farmService.getTokensForExitFarm(args);
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => TransactionModel)
    async enterFarm(@Args() args: EnterFarmArgs): Promise<TransactionModel> {
        return await this.transactionsService.enterFarm(args);
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => [TransactionModel])
    async enterFarmBatch(
        @Args() enterFarmBatchArgs: EnterFarmBatchArgs,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        const depositTokenArgs: DepositTokenArgs = {
            smartContractType: SmartContractType.FARM,
            address: enterFarmBatchArgs.farmAddress,
            tokenID: enterFarmBatchArgs.farmTokenID,
            tokenNonce: enterFarmBatchArgs.farmTokenNonce,
            amount: enterFarmBatchArgs.amount,
        };
        const enterFarmArgs: EnterFarmArgs = {
            tokenInID: enterFarmBatchArgs.tokenInID,
            farmAddress: enterFarmBatchArgs.farmAddress,
            amount: enterFarmBatchArgs.amountIn,
            lockRewards: enterFarmBatchArgs.lockRewards,
        };

        return await Promise.all([
            this.mergeTokensTransactions.depositTokens(
                user.publicKey,
                depositTokenArgs,
            ),
            this.transactionsService.enterFarm(enterFarmArgs),
        ]);
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => TransactionModel)
    async exitFarm(
        @Args() args: ExitFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionsService.exitFarm(user.publicKey, args);
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => TransactionModel)
    async claimRewards(
        @Args() args: ClaimRewardsArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionsService.claimRewards(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => TransactionModel)
    async compoundRewards(
        @Args() args: CompoundRewardsArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionsService.compoundRewards(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => TransactionModel)
    async mergeFarmTokens(
        @Args() args: TokensMergingArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.mergeTokens(args);
    }
}
