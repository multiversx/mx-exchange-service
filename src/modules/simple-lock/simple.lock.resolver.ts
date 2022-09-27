import { UseGuards } from '@nestjs/common';
import { Args, Query, ResolveField, Resolver } from '@nestjs/graphql';
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
    async lockedToken(): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getLockedToken(),
        );
    }

    @ResolveField()
    async lpProxyToken(): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getLpProxyToken(),
        );
    }

    @ResolveField()
    async farmProxyToken(): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getFarmProxyToken(),
        );
    }

    @ResolveField()
    async intermediatedPairs(): Promise<string[]> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getIntermediatedPairs(),
        );
    }

    @ResolveField()
    async intermediatedFarms(): Promise<string[]> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getIntermediatedFarms(),
        );
    }

    @Query(() => SimpleLockModel)
    async simpleLock(): Promise<SimpleLockModel> {
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
