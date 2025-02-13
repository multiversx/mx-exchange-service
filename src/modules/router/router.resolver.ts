import { RouterService } from './services/router.service';
import {
    Resolver,
    Query,
    ResolveField,
    Args,
    Int,
    Float,
} from '@nestjs/graphql';
import { UseGuards, UsePipes } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { GetPairsArgs, PairModel } from '../pair/models/pair.model';
import { EnableSwapByUserConfig, FactoryModel } from './models/factory.model';
import { RouterTransactionService } from './services/router.transactions.service';
import { constantsConfig } from 'src/config';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { RemoteConfigGetterService } from '../remote-config/remote-config.getter.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { SetLocalRoleOwnerArgs } from './models/router.args';
import {
    PairFilterArgs,
    PairSortingArgs,
    PairsFilter,
} from './models/filter.args';
import { RouterAbiService } from './services/router.abi.service';
import { RouterComputeService } from './services/router.compute.service';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';
import { PairsResponse } from '../pair/models/pairs.response';
import ConnectionArgs, {
    getPagingParameters,
} from '../common/filters/connection.args';
import PageResponse from '../common/page.response';
import { AnalyticsAWSGetterService } from '../analytics/services/analytics.aws.getter.service';
import BigNumber from 'bignumber.js';
import { QueryArgsValidationPipe } from 'src/helpers/validators/query.args.validation.pipe';
import {
    relayQueryEstimator,
    paginatedQueryEstimator,
} from 'src/helpers/complexity/query.estimators';

@Resolver(() => FactoryModel)
export class RouterResolver {
    constructor(
        private readonly routerService: RouterService,
        private readonly routerabi: RouterAbiService,
        private readonly routerCompute: RouterComputeService,
        private readonly routerTransaction: RouterTransactionService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        private readonly analyticsAWSGetter: AnalyticsAWSGetterService,
    ) {}

    @Query(() => FactoryModel)
    async factory() {
        return this.routerService.getFactory();
    }

    @ResolveField()
    async commonTokensForUserPairs(): Promise<string[]> {
        return this.routerabi.commonTokensForUserPairs();
    }

    @ResolveField()
    async enableSwapByUserConfig(): Promise<EnableSwapByUserConfig[]> {
        const commonTokens = await this.routerabi.commonTokensForUserPairs();
        const configs = await Promise.all(
            commonTokens.map((tokenID) =>
                this.routerabi.enableSwapByUserConfig(tokenID),
            ),
        );

        return configs.filter((config) => config !== undefined);
    }

    @ResolveField(() => Int)
    async pairCount() {
        return this.routerCompute.pairCount();
    }

    @ResolveField(() => Int)
    async totalTxCount() {
        return this.routerCompute.totalTxCount();
    }

    @ResolveField()
    async totalValueLockedUSD() {
        return this.routerCompute.totalLockedValueUSD();
    }

    @ResolveField()
    async totalVolumeUSD24h() {
        const volumesUSD = await this.analyticsAWSGetter.getValues24hSum(
            'factory',
            'volumeUSD',
        );
        let totalVolumeUSD = new BigNumber(0);
        volumesUSD.forEach((volumeUSD) => {
            totalVolumeUSD = totalVolumeUSD.plus(volumeUSD.value);
        });
        return totalVolumeUSD.toFixed();
    }

    @ResolveField()
    async totalFeesUSD24h() {
        return this.routerCompute.totalFeesUSD('24h');
    }

    @ResolveField()
    async maintenance() {
        return this.remoteConfigGetterService.getMaintenanceFlagValue();
    }

    @ResolveField()
    async multiSwapStatus(): Promise<boolean> {
        return this.remoteConfigGetterService.getMultiSwapStatus();
    }

    @ResolveField(() => Boolean)
    async pairCreationEnabled(): Promise<boolean> {
        return this.routerabi.pairCreationEnabled();
    }

    @ResolveField(() => Boolean)
    async state(): Promise<boolean> {
        return this.routerabi.state();
    }

    @ResolveField(() => String)
    async owner(): Promise<string> {
        return this.routerabi.owner();
    }

    @ResolveField(() => String)
    async pairTemplateAddress(): Promise<string> {
        return this.routerabi.pairTemplateAddress();
    }

    @ResolveField(() => String)
    async temporaryOwnerPeriod(): Promise<string> {
        return this.routerabi.temporaryOwnerPeriod();
    }

    @ResolveField(() => Float)
    async defaultSlippage(): Promise<number> {
        return constantsConfig.slippage.DEFAULT_SLIPPAGE;
    }

    @ResolveField(() => [Float])
    async slippageValues(): Promise<number[]> {
        return constantsConfig.slippage.SLIPPAGE_VALUES;
    }

    @ResolveField(() => Float)
    async minSlippage(): Promise<number> {
        return constantsConfig.slippage.SLIPPAGE_VALUES[0];
    }

    @ResolveField(() => Float)
    async maxSlippage(): Promise<number> {
        return constantsConfig.slippage.MAX_SLIPPAGE;
    }

    @ResolveField(() => Float)
    async minSwapAmount(): Promise<number> {
        return constantsConfig.MIN_SWAP_AMOUNT;
    }

    @Query(() => [String])
    async pairAddresses(): Promise<string[]> {
        return this.routerabi.pairsAddress();
    }

    @Query(() => [PairModel], {
        deprecationReason:
            'New query (filteredPairs) following GraphQL "Connection" standard for pagination/sorting/filtering is now available.',
        complexity: paginatedQueryEstimator,
    })
    @UsePipes(new QueryArgsValidationPipe())
    async pairs(
        @Args() page: GetPairsArgs,
        @Args() filter: PairFilterArgs,
    ): Promise<PairModel[]> {
        return this.routerService.getAllPairs(page.offset, page.limit, filter);
    }

    @Query(() => PairsResponse, {
        complexity: relayQueryEstimator,
    })
    @UsePipes(new QueryArgsValidationPipe())
    async filteredPairs(
        @Args({ name: 'filters', type: () => PairsFilter, nullable: true })
        filters: PairsFilter,
        @Args({
            name: 'pagination',
            type: () => ConnectionArgs,
            nullable: true,
        })
        pagination: ConnectionArgs,
        @Args({
            name: 'sorting',
            type: () => PairSortingArgs,
            nullable: true,
        })
        sorting: PairSortingArgs,
    ): Promise<PairsResponse> {
        const { limit, offset } = getPagingParameters(pagination);

        const response = await this.routerService.getFilteredPairs(
            offset,
            limit,
            filters,
            sorting,
        );

        return PageResponse.mapResponse<PairModel>(
            response?.items || [],
            pagination ?? new ConnectionArgs(),
            response?.count || 0,
            offset,
            limit,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async createPair(
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.routerTransaction.createPair(
            user.address,
            firstTokenID,
            secondTokenID,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async upgradePair(
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @Args('fees', { type: () => [Float] }) fees: number[],
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.upgradePair(
            user.address,
            firstTokenID,
            secondTokenID,
            fees,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async issueLPToken(
        @Args('address') address: string,
        @Args('lpTokenName') lpTokenName: string,
        @Args('lpTokenTicker') lpTokenTicker: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.routerTransaction.issueLpToken(
            user.address,
            address,
            lpTokenName,
            lpTokenTicker,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async setLocalRoles(
        @Args('address') address: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.routerTransaction.setLocalRoles(user.address, address);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setState(
        @Args('address') address: string,
        @Args('enable') enable: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.setState(user.address, address, enable);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setFee(
        @Args('pairAddress') pairAddress: string,
        @Args('feeToAddress') feeToAddress: string,
        @Args('feeTokenID') feeTokenID: string,
        @Args('enable') enable: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.setFee(
            user.address,
            pairAddress,
            feeToAddress,
            feeTokenID,
            enable,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setPairCreationEnabled(
        @Args('enabled') enabled: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.setPairCreationEnabled(
            user.address,
            enabled,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async clearPairTemporaryOwnerStorage(
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.clearPairTemporaryOwnerStorage(
            user.address,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setTemporaryOwnerPeriod(
        @Args('periodBlocks') periodBlocks: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.setTemporaryOwnerPeriod(
            user.address,
            periodBlocks,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setPairTemplateAddress(
        @Args('address') address: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.setPairTemplateAddress(
            user.address,
            address,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setLocalRolesOwner(
        @Args({ name: 'args', type: () => SetLocalRoleOwnerArgs })
        args: SetLocalRoleOwnerArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.setLocalRolesOwner(user.address, args);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async removePair(
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.removePair(
            user.address,
            firstTokenID,
            secondTokenID,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async setSwapEnabledByUser(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.routerTransaction.setSwapEnabledByUser(
            user.address,
            inputTokens,
        );
    }
}
