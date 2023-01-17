import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { LockedTokenWrapperTransactionService } from './services/locked-token-wrapper.transaction.service';
import { LockedTokenWrapperModel } from './models/locked-token-wrapper.model';
import { GenericResolver } from '../../services/generics/generic.resolver';
import { scAddress } from '../../config';
import { LockedTokenWrapperGetterService } from './services/locked-token-wrapper.getter.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { TransactionModel } from '../../models/transaction.model';
import { InputTokenModel } from '../../models/inputToken.model';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { ApolloError } from 'apollo-server-express';
import { LockedTokenWrapperService } from './services/locked-token-wrapper.service';

@Resolver(() => LockedTokenWrapperModel)
export class LockedTokenWrapperResolver extends GenericResolver {
    constructor(
        private readonly lockedTokenWrapperTransactionService: LockedTokenWrapperTransactionService,
        private readonly lockedTokenWrapperService: LockedTokenWrapperService,
        private readonly lockedTokenWrapperGetter: LockedTokenWrapperGetterService,
    ) {
        super();
    }

    @ResolveField()
    async lockedTokenId(
        @Parent() parent: LockedTokenWrapperModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.lockedTokenWrapperGetter.getLockedTokenId(parent.address),
        );
    }

    @ResolveField()
    async wrappedTokenId(
        @Parent() parent: LockedTokenWrapperModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.lockedTokenWrapperGetter.getWrappedTokenId(parent.address),
        );
    }

    @ResolveField()
    async energyFactoryAddress(
        @Parent() parent: LockedTokenWrapperModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.lockedTokenWrapperGetter.getEnergyFactoryAddress(
                parent.address,
            ),
        );
    }

    @Query(() => LockedTokenWrapperModel)
    lockedTokenWrapper(
        @Args('address', { nullable: true }) address: string,
    ): LockedTokenWrapperModel {
        return this.lockedTokenWrapperService.lockedTokenWrapper(address);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async unwrapLockedToken(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.lockedTokenWrapperTransactionService.unwrapLockedToken(
                scAddress.lockedTokenWrapper,
                user.address,
                inputTokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async wrapLockedToken(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.lockedTokenWrapperTransactionService.wrapLockedToken(
                scAddress.lockedTokenWrapper,
                user.address,
                inputTokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
