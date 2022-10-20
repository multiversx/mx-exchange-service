import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { scAddress } from 'src/config';
import { User } from 'src/helpers/userDecorator';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { GqlAdminGuard } from '../auth/gql.admin.guard';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { EnergyModel, UnlockType } from './models/simple.lock.model';
import { SimpleLockEnergyModel } from './models/simple.lock.model';
import { EnergyGetterService } from './services/energy/energy.getter.service';
import { EnergyService } from './services/energy/energy.service';
import { EnergyTransactionService } from './services/energy/energy.transaction.service';
import { SimpleLockService } from './services/simple.lock.service';
import { SimpleLockResolver } from './simple.lock.resolver';

@Resolver(() => SimpleLockEnergyModel)
export class EnergyResolver extends SimpleLockResolver {
    constructor(
        protected readonly simpleLockService: SimpleLockService,
        protected readonly energyGetter: EnergyGetterService,
        protected readonly energyTransaction: EnergyTransactionService,
        private readonly energyService: EnergyService,
    ) {
        super(simpleLockService, energyGetter);
    }

    @ResolveField()
    async baseAssetToken(): Promise<EsdtToken> {
        return await this.genericFieldResover<EsdtToken>(() =>
            this.energyGetter.getBaseAssetToken(),
        );
    }

    @ResolveField()
    async lockOptions(): Promise<number[]> {
        return await this.genericFieldResover<number[]>(() =>
            this.energyGetter.getLockOptions(),
        );
    }

    @ResolveField()
    async pauseState(): Promise<boolean> {
        return await this.genericFieldResover<boolean>(() =>
            this.energyGetter.getPauseState(),
        );
    }

    @Query(() => SimpleLockEnergyModel)
    async simpleLockEnergy(): Promise<SimpleLockEnergyModel> {
        return new SimpleLockEnergyModel({
            address: scAddress.simpleLockEnergy,
        });
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => EnergyModel)
    async userEnergy(
        @Args('vmQuery', { nullable: true }) vmQuery: boolean,
        @User() user: any,
    ): Promise<EnergyModel> {
        return await this.genericQuery(() =>
            this.energyService.getUserEnergy(user.publicKey, vmQuery),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async updateLockedTokens(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @Args('unlockType') unlockType: UnlockType,
        @Args('epochsToReduce', { nullable: true }) epochsToReduce: number,
        @User() user: any,
    ): Promise<TransactionModel> {
        const simpleLockAddress =
            await this.simpleLockService.getSimpleLockAddressByTokenID(
                inputTokens.tokenID,
            );
        if (simpleLockAddress === undefined) {
            throw new ApolloError('invalid input token');
        }
        return await this.genericQuery(() =>
            this.energyTransaction.unlockTokens(
                simpleLockAddress,
                user.publicKey,
                inputTokens,
                unlockType,
                epochsToReduce,
            ),
        );
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async updateLockOptions(
        @Args('lockOptions', { type: () => [Int] }) lockOptions: number[],
        @Args('remove', { nullable: true }) remove: boolean,
        @User() user: any,
    ): Promise<TransactionModel> {
        const owner = await this.energyGetter.getOwnerAddress();
        if (user.publicKey !== owner) {
            throw new ApolloError('Invalid owner address');
        }

        return await this.genericQuery(() =>
            this.energyTransaction.updateLockOptions(lockOptions, remove),
        );
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setPenaltyPercentage(
        @Args('minPenaltyPercentage') minPenaltyPercentage: number,
        @Args('maxPenaltyPercentage') maxPenaltyPercentage: number,
        @User() user: any,
    ): Promise<TransactionModel> {
        const owner = await this.energyGetter.getOwnerAddress();
        if (user.publicKey !== owner) {
            throw new ApolloError('Invalid owner address');
        }

        return await this.genericQuery(() =>
            this.energyTransaction.setPenaltyPercentage(
                minPenaltyPercentage,
                maxPenaltyPercentage,
            ),
        );
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setFeesBurnPercentage(
        @Args('percentage') percentage: number,
        @User() user: any,
    ): Promise<TransactionModel> {
        const owner = await this.energyGetter.getOwnerAddress();
        if (user.publicKey !== owner) {
            throw new ApolloError('Invalid owner address');
        }

        return await this.genericQuery(() =>
            this.energyTransaction.setFeesBurnPercentage(percentage),
        );
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setFeesCollectorAddress(
        @Args('collectorAddress') collectorAddress: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        const owner = await this.energyGetter.getOwnerAddress();
        if (user.publicKey !== owner) {
            throw new ApolloError('Invalid owner address');
        }

        return await this.genericQuery(() =>
            this.energyTransaction.setFeesCollectorAddress(collectorAddress),
        );
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setOldLockedAssetFactoryAddress(
        @Args('oldLockedAssetFactoryAddress')
        oldLockedAssetFactoryAddress: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        const owner = await this.energyGetter.getOwnerAddress();
        if (user.publicKey !== owner) {
            throw new ApolloError('Invalid owner address');
        }

        return await this.genericQuery(() =>
            this.energyTransaction.setOldLockedAssetFactoryAddress(
                oldLockedAssetFactoryAddress,
            ),
        );
    }
}
