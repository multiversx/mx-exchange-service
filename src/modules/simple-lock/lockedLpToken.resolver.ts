import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { tokenCollection } from 'src/utils/token.converters';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import {
    LockedTokenAttributesModel,
    LpProxyTokenAttributesModel,
} from './models/simple.lock.model';
import { SimpleLockService } from './services/simple.lock.service';

@Resolver(LpProxyTokenAttributesModel)
export class LockedLpTokenResolver {
    constructor(private readonly simpleLockService: SimpleLockService) {}

    @ResolveField()
    async firstTokenLockedAttributes(
        @Parent() parent: LpProxyTokenAttributesModel,
    ): Promise<LockedTokenAttributesModel> {
        try {
            if (parent.firstTokenLockedNonce === 0) {
                return null;
            }
            return await this.simpleLockService.getLockedTokenAttributes(
                tokenCollection(parent.identifier),
                parent.firstTokenLockedNonce,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondTokenLockedAttributes(
        @Parent() parent: LpProxyTokenAttributesModel,
    ): Promise<LockedTokenAttributesModel> {
        try {
            if (parent.secondTokenLockedNonce === 0) {
                return null;
            }
            return await this.simpleLockService.getLockedTokenAttributes(
                tokenCollection(parent.identifier),
                parent.secondTokenLockedNonce,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [LpProxyTokenAttributesModel])
    async lpProxyTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<LpProxyTokenAttributesModel[]> {
        try {
            return this.simpleLockService.decodeBatchLpTokenProxyAttributes(
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
