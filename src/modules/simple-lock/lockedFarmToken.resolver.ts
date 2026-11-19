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

@Resolver(() => FarmProxyTokenAttributesModel)
export class LockedFarmTokenResolver {
    constructor(private readonly simpleLockService: SimpleLockService) {}

    @ResolveField()
    async farmingTokenAttributes(
        parent: FarmProxyTokenAttributesModel,
    ): Promise<LpProxyTokenAttributesModel> {
        return this.simpleLockService.getLpTokenProxyAttributes(
            tokenCollection(parent.identifier),
            parent.farmingTokenLockedNonce,
        );
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
        return this.simpleLockService.getFarmTokenAttributes(
            parent.farmTokenID,
            parent.farmTokenNonce,
            simpleLockAddress,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [FarmProxyTokenAttributesModel])
    async farmProxyTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<FarmProxyTokenAttributesModel[]> {
        return this.simpleLockService.decodeBatchFarmProxyTokenAttributes(args);
    }
}
