import { UseGuards } from '@nestjs/common';
import {
    Args,
    Int,
    Parent,
    Query,
    ResolveField,
    Resolver,
} from '@nestjs/graphql';
import { scAddress } from 'src/config';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { NftCollection } from '../tokens/models/nftCollection.model';
import { UnlockType, UserEnergyModel } from './models/energy.model';
import {
    LockOption,
    SimpleLockEnergyModel,
} from './models/simple.lock.energy.model';
import { EnergyService } from './services/energy.service';
import { EnergyTransactionService } from './services/energy.transaction.service';
import { LockedEnergyTokensValidationPipe } from './validators/locked.tokens.validator';
import { EnergyAbiService } from './services/energy.abi.service';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';

@Resolver(() => UserEnergyModel)
export class UserEnergyResolver {
    constructor(
        private readonly energyService: EnergyService,
        private readonly energyCompute: EnergyComputeService,
    ) {}

    @ResolveField()
    async league(@Parent() parent: UserEnergyModel): Promise<string> {
        return this.energyCompute.computeLeagueByEnergy(parent.amount);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => UserEnergyModel)
    async userEnergy(
        @AuthUser() user: UserAuthResult,
        @Args('vmQuery', { nullable: true }) vmQuery: boolean,
    ): Promise<UserEnergyModel> {
        return this.energyService.getUserEnergy(user.address, vmQuery);
    }
}

@Resolver(() => SimpleLockEnergyModel)
export class EnergyResolver {
    constructor(
        private readonly energyTransaction: EnergyTransactionService,
        private readonly energyService: EnergyService,
        private readonly energyAbi: EnergyAbiService,
    ) {}

    @ResolveField()
    async baseAssetToken(): Promise<EsdtToken> {
        return this.energyService.getBaseAssetToken();
    }

    @ResolveField()
    async lockedToken(): Promise<NftCollection> {
        return this.energyService.getLockedToken();
    }

    @ResolveField()
    async legacyLockedToken(): Promise<NftCollection> {
        return this.energyService.getLegacyLockedToken();
    }

    @ResolveField()
    async tokenUnstakeAddress(): Promise<string> {
        return this.energyAbi.tokenUnstakeScAddress();
    }

    @ResolveField()
    async lockOptions(): Promise<LockOption[]> {
        return this.energyAbi.lockOptions();
    }

    @ResolveField()
    async pauseState(): Promise<boolean> {
        return this.energyAbi.isPaused();
    }

    @Query(() => SimpleLockEnergyModel)
    async simpleLockEnergy(): Promise<SimpleLockEnergyModel> {
        return new SimpleLockEnergyModel({
            address: scAddress.simpleLockEnergy,
        });
    }

    @Query(() => String)
    async penaltyAmount(
        @Args('inputToken') inputToken: InputTokenModel,
        @Args('newLockPeriod') newLockPeriod: number,
        @Args('vmQuery', { nullable: true }) vmQuery: boolean,
    ): Promise<string> {
        return this.energyService.getPenaltyAmount(
            inputToken,
            newLockPeriod,
            vmQuery,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async lockTokensEnergy(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @Args('lockEpochs', { type: () => Int }) lockEpochs: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.energyTransaction.lockTokens(
            user.address,
            inputTokens,
            lockEpochs,
        );
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
        return this.energyTransaction.unlockTokens(
            user.address,
            inputToken,
            unlockType,
            newLockPeriod,
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
        return this.energyTransaction.mergeTokens(user.address, inputTokens);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async migrateOldTokens(
        @Args('tokens', { type: () => [InputTokenModel] })
        args: InputTokenModel[],
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.energyTransaction.migrateOldTokens(user.address, args);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async updateLockOptions(
        @Args('lockOptions', { type: () => [Int] }) lockOptions: number[],
        @Args('remove', { nullable: true }) remove: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const owner = await this.energyAbi.ownerAddress();
        if (user.address !== owner) {
            throw new GraphQLError('Invalid owner address', {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }

        return this.energyTransaction.updateLockOptions(lockOptions, remove);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setPenaltyPercentage(
        @Args('minPenaltyPercentage') minPenaltyPercentage: number,
        @Args('maxPenaltyPercentage') maxPenaltyPercentage: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const owner = await this.energyAbi.ownerAddress();
        if (user.address !== owner) {
            throw new GraphQLError('Invalid owner address', {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }

        return this.energyTransaction.setPenaltyPercentage(
            minPenaltyPercentage,
            maxPenaltyPercentage,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setFeesBurnPercentage(
        @Args('percentage') percentage: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const owner = await this.energyAbi.ownerAddress();
        if (user.address !== owner) {
            throw new GraphQLError('Invalid owner address', {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }

        return this.energyTransaction.setFeesBurnPercentage(percentage);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setFeesCollectorAddress(
        @Args('collectorAddress') collectorAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const owner = await this.energyAbi.ownerAddress();
        if (user.address !== owner) {
            throw new GraphQLError('Invalid owner address', {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }

        return this.energyTransaction.setFeesCollectorAddress(collectorAddress);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setOldLockedAssetFactoryAddress(
        @Args('oldLockedAssetFactoryAddress')
        oldLockedAssetFactoryAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const owner = await this.energyAbi.ownerAddress();
        if (user.address !== owner) {
            throw new GraphQLError('Invalid owner address', {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }

        return this.energyTransaction.setOldLockedAssetFactoryAddress(
            oldLockedAssetFactoryAddress,
        );
    }

    // Get energy amount for authenticated user
    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => String)
    async userEnergyAmount(@AuthUser() user: UserAuthResult): Promise<string> {
        return this.energyAbi.energyAmountForUser(user.address);
    }
}
