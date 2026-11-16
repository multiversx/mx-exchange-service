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

@Resolver(LpProxyTokenAttributesModel)
export class LockedLpTokenResolver {
    constructor(private readonly simpleLockService: SimpleLockService) {}

    @ResolveField()
    async firstTokenLockedAttributes(
        parent: LpProxyTokenAttributesModel,
    ): Promise<LockedTokenAttributesModel> {
        if (parent.firstTokenLockedNonce === 0) {
            return null;
        }
        return this.simpleLockService.getLockedTokenAttributes(
            tokenCollection(parent.identifier),
            parent.firstTokenLockedNonce,
        );
    }

    @ResolveField()
    async secondTokenLockedAttributes(
        parent: LpProxyTokenAttributesModel,
    ): Promise<LockedTokenAttributesModel> {
        if (parent.secondTokenLockedNonce === 0) {
            return null;
        }
        return this.simpleLockService.getLockedTokenAttributes(
            tokenCollection(parent.identifier),
            parent.secondTokenLockedNonce,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [LpProxyTokenAttributesModel])
    async lpProxyTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<LpProxyTokenAttributesModel[]> {
        return this.simpleLockService.decodeBatchLpTokenProxyAttributes(args);
    }
}
