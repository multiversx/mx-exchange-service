import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import {
    LockedTokenAttributesModel,
    SimpleLockModel,
} from './models/simple.lock.model';
import { SimpleLockService } from './services/simple.lock.service';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { SimpleLockAbiService } from './services/simple.lock.abi.service';

@Resolver(() => SimpleLockModel)
export class SimpleLockResolver extends GenericResolver {
    constructor(
        protected readonly simpleLockService: SimpleLockService,
        protected readonly simpleLockAbi: SimpleLockAbiService,
    ) {
        super();
    }

    @ResolveField()
    async lockedToken(
        @Parent() parent: SimpleLockModel,
    ): Promise<NftCollection> {
        return await this.genericFieldResolver(() =>
            this.simpleLockService.getLockedToken(parent.address),
        );
    }

    @ResolveField()
    async lpProxyToken(
        @Parent() parent: SimpleLockModel,
    ): Promise<NftCollection> {
        return await this.genericFieldResolver(() =>
            this.simpleLockService.getLpProxyToken(parent.address),
        );
    }

    @ResolveField()
    async farmProxyToken(
        @Parent() parent: SimpleLockModel,
    ): Promise<NftCollection> {
        return await this.genericFieldResolver(() =>
            this.simpleLockService.getFarmProxyToken(parent.address),
        );
    }

    @ResolveField()
    async intermediatedPairs(
        @Parent() parent: SimpleLockModel,
    ): Promise<string[]> {
        return await this.genericFieldResolver(() =>
            this.simpleLockAbi.intermediatedPairs(parent.address),
        );
    }

    @ResolveField()
    async intermediatedFarms(
        @Parent() parent: SimpleLockModel,
    ): Promise<string[]> {
        return await this.genericFieldResolver(() =>
            this.simpleLockAbi.intermediatedFarms(parent.address),
        );
    }

    @Query(() => [SimpleLockModel])
    async simpleLock(): Promise<SimpleLockModel[]> {
        try {
            return this.simpleLockService.getSimpleLock();
        } catch (error) {}
    }

    @UseGuards(JwtOrNativeAuthGuard)
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
