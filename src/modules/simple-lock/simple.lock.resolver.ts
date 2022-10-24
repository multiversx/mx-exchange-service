import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import {
    LockedTokenAttributesModel,
    SimpleLockModel,
} from './models/simple.lock.model';
import { SimpleLockGetterService } from './services/simple.lock.getter.service';
import { SimpleLockService } from './services/simple.lock.service';
import { GenericResolver } from 'src/services/generics/generic.resolver';

@Resolver(() => SimpleLockModel)
export class SimpleLockResolver extends GenericResolver {
    constructor(
        protected readonly simpleLockService: SimpleLockService,
        protected readonly simpleLockGetter: SimpleLockGetterService,
    ) {
        super();
    }

    @ResolveField()
    async lockedToken(
        @Parent() parent: SimpleLockModel,
    ): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getLockedToken(parent.address),
        );
    }

    @ResolveField()
    async lpProxyToken(
        @Parent() parent: SimpleLockModel,
    ): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getLpProxyToken(parent.address),
        );
    }

    @ResolveField()
    async farmProxyToken(
        @Parent() parent: SimpleLockModel,
    ): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getFarmProxyToken(parent.address),
        );
    }

    @ResolveField()
    async intermediatedPairs(
        @Parent() parent: SimpleLockModel,
    ): Promise<string[]> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getIntermediatedPairs(parent.address),
        );
    }

    @ResolveField()
    async intermediatedFarms(
        @Parent() parent: SimpleLockModel,
    ): Promise<string[]> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getIntermediatedFarms(parent.address),
        );
    }

    @Query(() => [SimpleLockModel])
    async simpleLock(): Promise<SimpleLockModel[]> {
        try {
            return this.simpleLockService.getSimpleLock();
        } catch (error) {}
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [LockedTokenAttributesModel])
    async lockedTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<LockedTokenAttributesModel[]> {
        try {
            return this.simpleLockService.decodeBatchLockedTokenAttributes(
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
