import { RouterService } from './services/router.service';
import {
    Resolver,
    Query,
    ResolveField,
    Args,
    Int,
    Float,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { GetPairsArgs, PairModel } from '../pair/models/pair.model';
import { EnableSwapByUserConfig, FactoryModel } from './models/factory.model';
import { RouterTransactionService } from './services/router.transactions.service';
import { ApolloError } from 'apollo-server-express';
import { constantsConfig } from 'src/config';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { RemoteConfigGetterService } from '../remote-config/remote-config.getter.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { GqlAdminGuard } from '../auth/gql.admin.guard';
import { SetLocalRoleOwnerArgs } from './models/router.args';
import { PairFilterArgs } from './models/filter.args';
import { RouterAbiService } from './services/router.abi.service';
import { RouterComputeService } from './services/router.compute.service';

@Resolver(() => FactoryModel)
export class RouterResolver {
    constructor(
        private readonly routerService: RouterService,
        private readonly routerabi: RouterAbiService,
        private readonly routerCompute: RouterComputeService,
        private readonly routerTransaction: RouterTransactionService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
    ) {}

    @Query(() => FactoryModel)
    async factory() {
        return this.routerService.getFactory();
    }

    @ResolveField()
    async commonTokensForUserPairs(): Promise<string[]> {
        try {
            return await this.routerabi.commonTokensForUserPairs();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async enableSwapByUserConfig(): Promise<EnableSwapByUserConfig> {
        try {
            return await this.routerabi.enableSwapByUserConfig();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => Int)
    async pairCount() {
        try {
            return await this.routerCompute.pairCount();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => Int)
    async totalTxCount() {
        try {
            return await this.routerCompute.totalTxCount();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async totalValueLockedUSD() {
        try {
            return await this.routerCompute.totalLockedValueUSD();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async totalVolumeUSD24h() {
        try {
            return this.routerCompute.totalVolumeUSD('24h');
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async totalFeesUSD24h() {
        try {
            return this.routerCompute.totalFeesUSD('24h');
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async maintenance() {
        try {
            return await this.remoteConfigGetterService.getMaintenanceFlagValue();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async multiSwapStatus(): Promise<boolean> {
        try {
            return await this.remoteConfigGetterService.getMultiSwapStatus();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => Boolean)
    async pairCreationEnabled(): Promise<boolean> {
        try {
            return await this.routerabi.pairCreationEnabled();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => Boolean)
    async state(): Promise<boolean> {
        try {
            return await this.routerabi.state();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => String)
    async owner(): Promise<string> {
        try {
            return await this.routerabi.owner();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => String)
    async pairTemplateAddress(): Promise<string> {
        try {
            return await this.routerabi.pairTemplateAddress();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => String)
    async temporaryOwnerPeriod(): Promise<string> {
        try {
            return await this.routerabi.temporaryOwnerPeriod();
        } catch (error) {
            throw new ApolloError(error);
        }
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

    @ResolveField(() => String)
    async lastErrorMessage(): Promise<string> {
        try {
            return await this.routerabi.lastErrorMessage();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [String])
    async pairAddresses(): Promise<string[]> {
        try {
            return await this.routerabi.pairsAddress();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [PairModel])
    async pairs(
        @Args() page: GetPairsArgs,
        @Args() filter: PairFilterArgs,
    ): Promise<PairModel[]> {
        try {
            return await this.routerService.getAllPairs(
                page.offset,
                page.limit,
                filter,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
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

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async upgradePair(
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @Args('fees', { type: () => [Float] }) fees: number[],
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.address);
        return this.routerTransaction.upgradePair(
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
    ): Promise<TransactionModel> {
        return this.routerTransaction.issueLpToken(
            address,
            lpTokenName,
            lpTokenTicker,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async setLocalRoles(
        @Args('address') address: string,
    ): Promise<TransactionModel> {
        return this.routerTransaction.setLocalRoles(address);
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setState(
        @Args('address') address: string,
        @Args('enable') enable: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.address);
            return this.routerTransaction.setState(address, enable);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setFee(
        @Args('pairAddress') pairAddress: string,
        @Args('feeToAddress') feeToAddress: string,
        @Args('feeTokenID') feeTokenID: string,
        @Args('enable') enable: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.address);
            return this.routerTransaction.setFee(
                pairAddress,
                feeToAddress,
                feeTokenID,
                enable,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setPairCreationEnabled(
        @Args('enabled') enabled: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.address);
            return this.routerTransaction.setPairCreationEnabled(enabled);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => String)
    async getLastErrorMessage(): Promise<string> {
        try {
            return await this.routerabi.lastErrorMessage();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async clearPairTemporaryOwnerStorage(
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.address);
            return this.routerTransaction.clearPairTemporaryOwnerStorage();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setTemporaryOwnerPeriod(
        @Args('periodBlocks') periodBlocks: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.address);
            return this.routerTransaction.setTemporaryOwnerPeriod(periodBlocks);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setPairTemplateAddress(
        @Args('address') address: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.address);
            return this.routerTransaction.setPairTemplateAddress(address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setLocalRolesOwner(
        @Args({ name: 'args', type: () => SetLocalRoleOwnerArgs })
        args: SetLocalRoleOwnerArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.address);
            return this.routerTransaction.setLocalRolesOwner(args);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async removePair(
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.address);
            return this.routerTransaction.removePair(
                firstTokenID,
                secondTokenID,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async setSwapEnabledByUser(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.routerTransaction.setSwapEnabledByUser(
                user.address,
                inputTokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
