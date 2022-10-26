import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError, UserInputError } from 'apollo-server-express';
import { tokenCollection } from 'src/utils/token.converters';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { FarmTokenAttributesModelV1_3 } from '../farm/models/farmTokenAttributes.model';
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
                tokenCollection(parent.identifier),
                parent.farmingTokenLockedNonce,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmTokenAttributes(
        @Parent() parent: FarmProxyTokenAttributesModel,
    ): Promise<FarmTokenAttributesModelV1_3> {
        const simpleLockAddress =
            await this.simpleLockService.getSimpleLockAddressByTokenID(
                tokenCollection(parent.identifier),
            );
        if (simpleLockAddress === undefined) {
            throw new UserInputError('invalid locked farm token identifier');
        }
        try {
            return await this.simpleLockService.getFarmTokenAttributes(
                parent.farmTokenID,
                parent.farmTokenNonce,
                simpleLockAddress,
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
