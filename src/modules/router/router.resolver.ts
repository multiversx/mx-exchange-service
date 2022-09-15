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
import { TransactionRouterService } from './services/transactions.router.service';
import { ApolloError } from 'apollo-server-express';
import { RouterGetterService } from './services/router.getter.service';
import { constantsConfig } from 'src/config';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { User } from 'src/helpers/userDecorator';
import { RemoteConfigGetterService } from '../remote-config/remote-config.getter.service';
import { InputTokenModel } from 'src/models/inputToken.model';
import { GqlAdminGuard } from '../auth/gql.admin.guard';
import { SetLocalRoleOwnerArgs } from './models/router.args';
import { PairFilterArgs } from './models/filter.args';

@Resolver(() => FactoryModel)
export class RouterResolver {
    constructor(
        private readonly routerService: RouterService,
        private readonly routerGetterService: RouterGetterService,
        private readonly transactionService: TransactionRouterService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
    ) {}

    @Query(() => FactoryModel)
    async factory() {
        return this.routerService.getFactory();
    }

    @ResolveField()
    async commonTokensForUserPairs(): Promise<string[]> {
        try {
            return await this.routerGetterService.getCommonTokensForUserPairs();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async enableSwapByUserConfig(): Promise<EnableSwapByUserConfig> {
        try {
            return await this.routerGetterService.getEnableSwapByUserConfig();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => Int)
    async pairCount() {
        try {
            return await this.routerGetterService.getPairCount();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => Int)
    async totalTxCount() {
        try {
            return await this.routerGetterService.getTotalTxCount();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async totalValueLockedUSD() {
        try {
            return await this.routerGetterService.getTotalLockedValueUSD();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async totalVolumeUSD24h() {
        try {
            return this.routerGetterService.getTotalVolumeUSD('24h');
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async totalFeesUSD24h() {
        try {
            return this.routerGetterService.getTotalFeesUSD('24h');
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
            return await this.routerGetterService.getPairCreationEnabled();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => Boolean)
    async state(): Promise<boolean> {
        try {
            return await this.routerGetterService.getState();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => String)
    async owner(): Promise<string> {
        try {
            return await this.routerGetterService.getOwner();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => String)
    async pairTemplateAddress(): Promise<string> {
        try {
            return await this.routerGetterService.getPairTemplateAddress();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => String)
    async temporaryOwnerPeriod(): Promise<string> {
        try {
            return await this.routerGetterService.getTemporaryOwnerPeriod();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => String)
    async lastErrorMessage(): Promise<string> {
        try {
            return await this.routerGetterService.getLastErrorMessage();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [String])
    async pairAddresses(): Promise<string[]> {
        try {
            return await this.routerGetterService.getAllPairsAddress();
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

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async createPair(
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        return this.transactionService.createPair(
            user.publicKey,
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
        @User() user: any,
    ): Promise<TransactionModel> {
        await this.routerService.requireOwner(user.publicKey);
        return this.transactionService.upgradePair(
            firstTokenID,
            secondTokenID,
            fees,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async issueLPToken(
        @Args('address') address: string,
        @Args('lpTokenName') lpTokenName: string,
        @Args('lpTokenTicker') lpTokenTicker: string,
    ): Promise<TransactionModel> {
        return this.transactionService.issueLpToken(
            address,
            lpTokenName,
            lpTokenTicker,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async setLocalRoles(
        @Args('address') address: string,
    ): Promise<TransactionModel> {
        return this.transactionService.setLocalRoles(address);
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setState(
        @Args('address') address: string,
        @Args('enable') enable: boolean,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.publicKey);
            return this.transactionService.setState(address, enable);
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
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.publicKey);
            return this.transactionService.setFee(
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
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.publicKey);
            return this.transactionService.setPairCreationEnabled(enabled);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => String)
    async getLastErrorMessage(): Promise<string> {
        try {
            return await this.routerGetterService.getLastErrorMessage();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async clearPairTemporaryOwnerStorage(
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.publicKey);
            return this.transactionService.clearPairTemporaryOwnerStorage();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setTemporaryOwnerPeriod(
        @Args('periodBlocks') periodBlocks: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.publicKey);
            return this.transactionService.setTemporaryOwnerPeriod(
                periodBlocks,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setPairTemplateAddress(
        @Args('address') address: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.publicKey);
            return this.transactionService.setPairTemplateAddress(address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setLocalRolesOwner(
        @Args({ name: 'args', type: () => SetLocalRoleOwnerArgs })
        args: SetLocalRoleOwnerArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.publicKey);
            return this.transactionService.setLocalRolesOwner(args);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async removePair(
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.routerService.requireOwner(user.publicKey);
            return this.transactionService.removePair(
                firstTokenID,
                secondTokenID,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async setSwapEnabledByUser(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.transactionService.setSwapEnabledByUser(
                user.publicKey,
                inputTokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
