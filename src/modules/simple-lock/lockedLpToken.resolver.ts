import { UseGuards } from '@nestjs/common';
import { Args, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { tokenCollection } from 'src/utils/token.converters';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import {
    LockedTokenAttributesModel,
    LpProxyTokenAttributesModel,
} from './models/simple.lock.model';
import { SimpleLockService } from './services/simple.lock.service';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';

@Resolver(LpProxyTokenAttributesModel)
export class LockedLpTokenResolver {
    constructor(private readonly simpleLockService: SimpleLockService) {}

    @ResolveField()
    async firstTokenLockedAttributes(
        parent: LpProxyTokenAttributesModel,
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
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }

    @ResolveField()
    async secondTokenLockedAttributes(
        parent: LpProxyTokenAttributesModel,
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
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [LpProxyTokenAttributesModel])
    async lpProxyTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<LpProxyTokenAttributesModel[]> {
        try {
            return this.simpleLockService.decodeBatchLpTokenProxyAttributes(
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
