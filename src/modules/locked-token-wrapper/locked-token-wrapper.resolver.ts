import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
    LockedTokenWrapperService
} from './services/locked-token-wrapper.service';
import { LockedTokenWrapperModel } from './models/locked-token-wrapper.model';
import { GenericResolver } from '../../services/generics/generic.resolver';
import { scAddress } from '../../config';
import {
    LockedTokenWrapperGetterService
} from './services/locked-token-wrapper.getter.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { TransactionModel } from '../../models/transaction.model';
import { InputTokenModel } from '../../models/inputToken.model';
import { User } from '../../helpers/userDecorator';
import { ApolloError } from 'apollo-server-express';

@Resolver(() => LockedTokenWrapperModel)
export class LockedTokenWrapperResolver extends GenericResolver {
    constructor(
        private readonly lockedTokenWrapperService: LockedTokenWrapperService,
        private readonly lockedTokenWrapperGetter: LockedTokenWrapperGetterService,
    ) {
        super();
    }

    @ResolveField()
    async lockedTokenId(@Parent() parent: LockedTokenWrapperModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.lockedTokenWrapperGetter.getLockedTokenId(parent.address),
        );
    }

    @ResolveField()
    async wrappedTokenId(@Parent() parent: LockedTokenWrapperModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.lockedTokenWrapperGetter.getWrappedTokenId(parent.address),
        );
    }

    @Query(() => LockedTokenWrapperModel)
    async lockedTokenWrapper(): Promise<LockedTokenWrapperModel> {
        return await this.genericQuery(() =>
            this.lockedTokenWrapperService.lockedTokenWrapper(scAddress.lockedTokenWrapper),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async unwrapLockedToken(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.lockedTokenWrapperService.unwrapLockedToken(
                scAddress.lockedTokenWrapper,
                user.publicKey,
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
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.lockedTokenWrapperService.wrapLockedToken(
                scAddress.lockedTokenWrapper,
                user.publicKey,
                inputTokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
