import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { scAddress } from 'src/config';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { GqlAdminGuard } from '../auth/gql.admin.guard';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { NftCollection } from '../tokens/models/nftCollection.model';
import { EnergyModel, UnlockType } from './models/energy.model';
import {
    LockOption,
    SimpleLockEnergyModel,
} from './models/simple.lock.energy.model';
import { EnergyService } from './services/energy.service';
import { EnergyTransactionService } from './services/energy.transaction.service';
import { LockedEnergyTokensValidationPipe } from './validators/locked.tokens.validator';
import { EnergyAbiService } from './services/energy.abi.service';

@Resolver(() => SimpleLockEnergyModel)
export class EnergyResolver extends GenericResolver {
    constructor(
        protected readonly energyTransaction: EnergyTransactionService,
        private readonly energyService: EnergyService,
        private readonly energyAbi: EnergyAbiService,
    ) {
        super();
    }

    @ResolveField()
    async baseAssetToken(): Promise<EsdtToken> {
        return await this.genericFieldResolver<EsdtToken>(() =>
            this.energyService.getBaseAssetToken(),
        );
    }

    @ResolveField()
    async lockedToken(): Promise<NftCollection> {
        return await this.genericFieldResolver<NftCollection>(() =>
            this.energyService.getLockedToken(),
        );
    }

    @ResolveField()
    async legacyLockedToken(): Promise<NftCollection> {
        return await this.genericFieldResolver<NftCollection>(() =>
            this.energyService.getLegacyLockedToken(),
        );
    }

    @ResolveField()
    async tokenUnstakeAddress(): Promise<string> {
        return await this.genericFieldResolver<string>(() =>
            this.energyAbi.tokenUnstakeScAddress(),
        );
    }

    @ResolveField()
    async lockOptions(): Promise<LockOption[]> {
        return await this.genericFieldResolver<LockOption[]>(() =>
            this.energyAbi.lockOptions(),
        );
    }

    @ResolveField()
    async pauseState(): Promise<boolean> {
        return await this.genericFieldResolver<boolean>(() =>
            this.energyAbi.isPaused(),
        );
    }

    @Query(() => SimpleLockEnergyModel)
    async simpleLockEnergy(): Promise<SimpleLockEnergyModel> {
        return new SimpleLockEnergyModel({
            address: scAddress.simpleLockEnergy,
        });
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => EnergyModel)
    async userEnergy(
        @AuthUser() user: UserAuthResult,
        @Args('vmQuery', { nullable: true }) vmQuery: boolean,
    ): Promise<EnergyModel> {
        return await this.genericQuery(() =>
            this.energyService.getUserEnergy(user.address, vmQuery),
        );
    }

    @Query(() => String)
    async penaltyAmount(
        @Args('inputToken') inputToken: InputTokenModel,
        @Args('newLockPeriod') newLockPeriod: number,
        @Args('vmQuery', { nullable: true }) vmQuery: boolean,
    ): Promise<string> {
        return await this.genericQuery(() =>
            this.energyService.getPenaltyAmount(
                inputToken,
                newLockPeriod,
                vmQuery,
            ),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async lockTokensEnergy(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @Args('lockEpochs', { type: () => Int }) lockEpochs: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.energyTransaction.lockTokens(
                user.address,
                inputTokens,
                lockEpochs,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async updateLockedTokensEnergy(
        @Args('inputToken', LockedEnergyTokensValidationPipe)
        inputToken: InputTokenModel,
        @Args('unlockType', { type: () => UnlockType }) unlockType: UnlockType,
        @Args('newLockPeriod', { nullable: true }) newLockPeriod: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.energyTransaction.unlockTokens(
                user.address,
                inputToken,
                unlockType,
                newLockPeriod,
            ),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async mergeTokensEnergy(
        @Args(
            'inputTokens',
            { type: () => [InputTokenModel] },
            LockedEnergyTokensValidationPipe,
        )
        inputTokens: InputTokenModel[],
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.energyTransaction.mergeTokens(user.address, inputTokens),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async migrateOldTokens(
        @Args('tokens', { type: () => [InputTokenModel] })
        args: InputTokenModel[],
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.energyTransaction.migrateOldTokens(
            user.address,
            args,
        );
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async updateLockOptions(
        @Args('lockOptions', { type: () => [Int] }) lockOptions: number[],
        @Args('remove', { nullable: true }) remove: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const owner = await this.energyAbi.ownerAddress();
        if (user.address !== owner) {
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
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const owner = await this.energyAbi.ownerAddress();
        if (user.address !== owner) {
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
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const owner = await this.energyAbi.ownerAddress();
        if (user.address !== owner) {
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
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const owner = await this.energyAbi.ownerAddress();
        if (user.address !== owner) {
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
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const owner = await this.energyAbi.ownerAddress();
        if (user.address !== owner) {
            throw new ApolloError('Invalid owner address');
        }

        return await this.genericQuery(() =>
            this.energyTransaction.setOldLockedAssetFactoryAddress(
                oldLockedAssetFactoryAddress,
            ),
        );
    }

    // Get energy amount for authenticated user
    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => String)
    async userEnergyAmount(@AuthUser() user: UserAuthResult): Promise<string> {
        return await this.energyAbi.energyAmountForUser(user.address);
    }
}
