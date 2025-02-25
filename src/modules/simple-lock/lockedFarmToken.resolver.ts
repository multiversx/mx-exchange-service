import { UseGuards } from '@nestjs/common';
import { Args, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { UserInputError } from '@nestjs/apollo';
import { tokenCollection } from 'src/utils/token.converters';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { FarmTokenAttributesUnion } from '../farm/models/farmTokenAttributes.model';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import {
    FarmProxyTokenAttributesModel,
    LpProxyTokenAttributesModel,
} from './models/simple.lock.model';
import { SimpleLockService } from './services/simple.lock.service';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';

@Resolver(() => FarmProxyTokenAttributesModel)
export class LockedFarmTokenResolver {
    constructor(private readonly simpleLockService: SimpleLockService) {}

    @ResolveField()
    async farmingTokenAttributes(
        parent: FarmProxyTokenAttributesModel,
    ): Promise<LpProxyTokenAttributesModel> {
        try {
            return await this.simpleLockService.getLpTokenProxyAttributes(
                tokenCollection(parent.identifier),
                parent.farmingTokenLockedNonce,
            );
        } catch (error) {
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }

    @ResolveField()
    async farmTokenAttributes(
        parent: FarmProxyTokenAttributesModel,
    ): Promise<typeof FarmTokenAttributesUnion> {
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
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [FarmProxyTokenAttributesModel])
    async farmProxyTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<FarmProxyTokenAttributesModel[]> {
        try {
            return this.simpleLockService.decodeBatchFarmProxyTokenAttributes(
                args,
            );
        } catch (error) {
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }
}
