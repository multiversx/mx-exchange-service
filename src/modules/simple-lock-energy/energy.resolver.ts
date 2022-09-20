import { UseGuards } from '@nestjs/common';
import { Args, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { scAddress } from 'src/config';
import { User } from 'src/helpers/userDecorator';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { GqlAdminGuard } from '../auth/gql.admin.guard';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import {
    Energy,
    SimpleLockEnergyModel,
    UnlockType,
} from './models/simple.lock.energy.model';
import { EnergyGetterService } from './services/energy.getter.service';
import { EnergyService } from './services/energy.service';
import { EnergyTransactionService } from './services/energy.transaction.service';

@Resolver(() => SimpleLockEnergyModel)
export class EnergyResolver extends GenericResolver {
    constructor(
        private readonly energyService: EnergyService,
        private readonly energyGetter: EnergyGetterService,
        private readonly energyTransaction: EnergyTransactionService,
    ) {
        super();
    }

    @ResolveField()
    async lockedTokenID(): Promise<string> {
        return await this.genericFieldResover<string>(() =>
            this.energyGetter.getLockedTokenID(),
        );
    }

    @ResolveField()
    async baseAssetTokenID(): Promise<string> {
        return await this.genericFieldResover<string>(() =>
            this.energyGetter.getBaseAssetTokenID(),
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
    @Query(() => Energy)
    async userEnergy(@User() user: any): Promise<Energy> {
        return await this.genericQuery(() =>
            this.energyService.getUserEnergy(user.publicKey),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async lockTokens(
        @Args() inputTokens: InputTokenModel,
        @Args() lockEpochs: number,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.energyTransaction.lockTokens(inputTokens, lockEpochs),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async updateLockedTokens(
        @Args() lockedTokens: InputTokenModel,
        @Args() unlockType: UnlockType,
        @Args({ nullable: true }) epochsToReduce: number,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.energyTransaction.updateTokens(
                lockedTokens,
                unlockType,
                epochsToReduce,
            ),
        );
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async updateLockOptions(
        @Args() lockOptions: number[],
        @Args({ nullable: true }) remove = false,
        @User() user: any,
    ): Promise<TransactionModel> {
        const owner = await this.energyGetter.getOwner();
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
        @Args() minPenaltyPercentage: number,
        @Args() maxPenaltyPercentage: number,
        @User() user: any,
    ): Promise<TransactionModel> {
        const owner = await this.energyGetter.getOwner();
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
        @Args() percentage: number,
        @User() user: any,
    ): Promise<TransactionModel> {
        const owner = await this.energyGetter.getOwner();
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
        @Args() collectorAddress: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        const owner = await this.energyGetter.getOwner();
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
        @Args() oldLockedAssetFactoryAddress: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        const owner = await this.energyGetter.getOwner();
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
