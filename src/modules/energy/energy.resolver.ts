import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { scAddress } from 'src/config';
import { User } from 'src/helpers/userDecorator';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { GqlAdminGuard } from '../auth/gql.admin.guard';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { NftCollection } from '../tokens/models/nftCollection.model';
import { EnergyModel, UnlockType } from './models/energy.model';
import {
    LockOption,
    SimpleLockEnergyModel,
} from './models/simple.lock.energy.model';
import { EnergyAbiService } from './services/energy.abi.service';
import { EnergyGetterService } from './services/energy.getter.service';
import { EnergyService } from './services/energy.service';
import { EnergyTransactionService } from './services/energy.transaction.service';
import { LockedEnergyTokensValidationPipe } from './validators/locked.tokens.validator';

@Resolver(() => SimpleLockEnergyModel)
export class EnergyResolver extends GenericResolver {
    constructor(
        protected readonly energyGetter: EnergyGetterService,
        protected readonly energyTransaction: EnergyTransactionService,
        private readonly energyService: EnergyService,
        private readonly energyAbi: EnergyAbiService,
    ) {
        super();
    }

    @ResolveField()
    async baseAssetToken(): Promise<EsdtToken> {
        return await this.genericFieldResover<EsdtToken>(() =>
            this.energyGetter.getBaseAssetToken(),
        );
    }

    @ResolveField()
    async lockedToken(): Promise<NftCollection> {
        return await this.genericFieldResover<NftCollection>(() =>
            this.energyGetter.getLockedToken(),
        );
    }

    @ResolveField()
    async legacyLockedToken(): Promise<NftCollection> {
        return await this.genericFieldResover<NftCollection>(() =>
            this.energyGetter.getLegacyLockedToken(),
        );
    }

    @ResolveField()
    async feesBurnPercentage(): Promise<number> {
        return await this.genericFieldResover<number>(() =>
            this.energyGetter.getFeesBurnPercentage(),
        );
    }

    @ResolveField()
    async feesCollectorAddress(): Promise<string> {
        return await this.genericFieldResover<string>(() =>
            this.energyGetter.getFeesCollectorAddress(),
        );
    }

    @ResolveField()
    async lastEpochFeeSentToCollector(): Promise<number> {
        return await this.genericFieldResover<number>(() =>
            this.energyGetter.getLastEpochFeeSentToCollector(),
        );
    }

    @ResolveField()
    async getFeesFromPenaltyUnlocking(): Promise<string> {
        return await this.genericFieldResover<string>(() =>
            this.energyGetter.getFeesFromPenaltyUnlocking(),
        );
    }

    @ResolveField()
    async lockOptions(): Promise<LockOption[]> {
        return await this.genericFieldResover<LockOption[]>(() =>
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
        @User() user: any,
        @Args('vmQuery', { nullable: true }) vmQuery: boolean,
    ): Promise<EnergyModel> {
        return await this.genericQuery(() =>
            this.energyService.getUserEnergy(user.publicKey, vmQuery),
        );
    }

    @Query(() => String)
    async penaltyAmount(
        @Args('inputToken') inputToken: InputTokenModel,
        @Args('epochsToReduce') epochsToReduce: number,
    ): Promise<string> {
        return await this.genericQuery(() =>
            this.energyAbi.getPenaltyAmount(inputToken, epochsToReduce),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async lockTokensEnergy(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @Args('lockEpochs', { type: () => Int }) lockEpochs: number,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.energyTransaction.lockTokens(
                user.publicKey,
                inputTokens,
                lockEpochs,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async updateLockedTokensEnergy(
        @Args('inputToken', LockedEnergyTokensValidationPipe)
        inputToken: InputTokenModel,
        @Args('unlockType', { type: () => UnlockType }) unlockType: UnlockType,
        @Args('epochsToReduce', { nullable: true }) epochsToReduce: number,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.energyTransaction.unlockTokens(
                user.publicKey,
                inputToken,
                unlockType,
                epochsToReduce,
            ),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async mergeTokensEnergy(
        @Args(
            'inputTokens',
            { type: () => [InputTokenModel] },
            LockedEnergyTokensValidationPipe,
        )
        inputTokens: InputTokenModel[],
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.energyTransaction.mergeTokens(user.publicKey, inputTokens),
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
