import { UseGuards } from '@nestjs/common';
import { Args, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import {
    LockedTokenAttributesModel,
    SimpleLockModel,
} from './models/simple.lock.model';
import { SimpleLockService } from './services/simple.lock.service';
import { SimpleLockAbiService } from './services/simple.lock.abi.service';
import { scAddress } from 'src/config';

@Resolver(() => SimpleLockModel)
export class SimpleLockResolver {
    constructor(
        protected readonly simpleLockService: SimpleLockService,
        protected readonly simpleLockAbi: SimpleLockAbiService,
    ) {}

    @ResolveField()
    async lockedToken(parent: SimpleLockModel): Promise<NftCollection> {
        return this.simpleLockService.getLockedToken(parent.address);
    }

    @ResolveField()
    async lpProxyToken(parent: SimpleLockModel): Promise<NftCollection> {
        return this.simpleLockService.getLpProxyToken(parent.address);
    }

    @ResolveField()
    async farmProxyToken(parent: SimpleLockModel): Promise<NftCollection> {
        return this.simpleLockService.getFarmProxyToken(parent.address);
    }

    @ResolveField()
    async intermediatedPairs(parent: SimpleLockModel): Promise<string[]> {
        return this.simpleLockAbi.intermediatedPairs(parent.address);
    }

    @ResolveField()
    async intermediatedFarms(parent: SimpleLockModel): Promise<string[]> {
        return this.simpleLockAbi.intermediatedFarms(parent.address);
    }

    @Query(() => [SimpleLockModel])
    async simpleLock(): Promise<SimpleLockModel[]> {
        return scAddress.simpleLockAddress.map(
            (address: string) =>
                new SimpleLockModel({
                    address,
                }),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [LockedTokenAttributesModel])
    async lockedTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<LockedTokenAttributesModel[]> {
        return this.simpleLockService.decodeBatchLockedTokenAttributes(args);
    }
}
