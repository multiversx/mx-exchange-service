import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { FarmTokenAttributesModel } from '../farm/models/farmTokenAttributes.model';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import {
    FarmProxyTokenAttributesModel,
    LpProxyTokenAttributesModel,
} from './models/simple.lock.model';
import { SimpleLockService } from './services/simple.lock.service';

@Resolver(() => FarmProxyTokenAttributesModel)
export class LockedFarmTokenResolver {
    constructor(private readonly simpleLockService: SimpleLockService) {}

    @ResolveField()
    async farmingTokenAttributes(
        @Parent() parent: FarmProxyTokenAttributesModel,
    ): Promise<LpProxyTokenAttributesModel> {
        try {
            return await this.simpleLockService.getLpTokenProxyAttributes(
                parent.farmingTokenLockedNonce,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmTokenAttributes(
        @Parent() parent: FarmProxyTokenAttributesModel,
    ): Promise<FarmTokenAttributesModel> {
        try {
            return await this.simpleLockService.getFarmTokenAttributes(
                parent.farmTokenID,
                parent.farmTokenNonce,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [FarmProxyTokenAttributesModel])
    async farmProxyTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<FarmProxyTokenAttributesModel[]> {
        try {
            return this.simpleLockService.decodeBatchFarmProxyTokenAttributes(
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
