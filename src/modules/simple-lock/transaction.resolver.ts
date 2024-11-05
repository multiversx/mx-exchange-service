import { LockedFarmTokenAttributes } from '@multiversx/sdk-exchange';
import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { farmVersion } from 'src/utils/farm.utils';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { SimpleLockService } from './services/simple.lock.service';
import { SimpleLockTransactionService } from './services/simple.lock.transactions.service';
import { EmterFarmProxyTokensValidationPipe } from './validators/enter.farm.tokens.validator';
import { FarmProxyTokensValidationPipe } from './validators/farm.token.validator';
import { LiquidityTokensValidationPipe } from './validators/liquidity.token.validator';
import { LpProxyTokensValidationPipe } from './validators/lpProxy.token.validator';
import { UnlockTokensValidationPipe } from './validators/unlock.tokens.validator';
import { SimpleLockAbiService } from './services/simple.lock.abi.service';
import { FarmAbiFactory } from '../farm/farm.abi.factory';

@Resolver()
export class TransactionResolver {
    constructor(
        private readonly simpleLockService: SimpleLockService,
        private readonly simpleLockAbi: SimpleLockAbiService,
        private readonly farmAbi: FarmAbiFactory,
        private readonly simpleLockTransactions: SimpleLockTransactionService,
    ) {}

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async lockTokens(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @Args('lockEpochs') lockEpochs: number,
        @Args('simpleLockAddress') simpleLockAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.simpleLockTransactions.lockTokens(
            user.address,
            inputTokens,
            lockEpochs,
            simpleLockAddress,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async unlockTokens(
        @Args('inputTokens', UnlockTokensValidationPipe)
        inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const simpleLockAddress =
            await this.simpleLockService.getSimpleLockAddressFromInputTokens([
                inputTokens,
            ]);
        return this.simpleLockTransactions.unlockTokens(
            simpleLockAddress,
            user.address,
            inputTokens,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel])
    async addLiquidityLockedTokenBatch(
        @Args(
            'inputTokens',
            { type: () => [InputTokenModel] },
            LiquidityTokensValidationPipe,
        )
        inputTokens: InputTokenModel[],
        @Args('pairAddress') pairAddress: string,
        @Args('tolerance') tolerance: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        const simpleLockAddress =
            await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                inputTokens,
            );
        return this.simpleLockTransactions.addLiquidityLockedTokenBatch(
            simpleLockAddress,
            user.address,
            inputTokens,
            pairAddress,
            tolerance,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel])
    async removeLiquidityLockedToken(
        @Args('inputTokens', LpProxyTokensValidationPipe)
        inputTokens: InputTokenModel,
        @Args('attributes') attributes: string,
        @Args('tolerance') tolerance: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        const simpleLockAddress =
            await this.simpleLockService.getSimpleLockAddressFromInputTokens([
                inputTokens,
            ]);
        return this.simpleLockTransactions.removeLiquidityLockedToken(
            simpleLockAddress,
            user.address,
            inputTokens,
            attributes,
            tolerance,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async enterFarmLockedToken(
        @Args(
            'inputTokens',
            { type: () => [InputTokenModel] },
            EmterFarmProxyTokensValidationPipe,
        )
        inputTokens: InputTokenModel[],
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const simpleLockAddress =
            await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                inputTokens,
            );
        return this.simpleLockTransactions.enterFarmLockedToken(
            simpleLockAddress,
            user.address,
            inputTokens,
            farmAddress,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async exitFarmLockedToken(
        @Args('inputTokens', FarmProxyTokensValidationPipe)
        inputTokens: InputTokenModel,
        @Args('exitAmount', { nullable: true }) exitAmount: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const simpleLockAddress =
            await this.simpleLockService.getSimpleLockAddressFromInputTokens([
                inputTokens,
            ]);
        const decodedAttributes = LockedFarmTokenAttributes.fromAttributes(
            inputTokens.attributes,
        );
        const [lockedTokenID, farmAddress] = await Promise.all([
            this.simpleLockAbi.lockedTokenID(simpleLockAddress),
            this.farmAbi.getFarmAddressByFarmTokenID(
                decodedAttributes.farmTokenID,
            ),
        ]);
        const version = farmVersion(farmAddress);
        if (
            decodedAttributes.farmType === 'FarmWithBoostedRewards' ||
            lockedTokenID.includes('LKESDT')
        ) {
            return this.simpleLockTransactions.exitFarmLockedToken(
                simpleLockAddress,
                user.address,
                inputTokens,
                version,
                exitAmount,
            );
        } else {
            return this.simpleLockTransactions.exitFarmOldToken(
                simpleLockAddress,
                user.address,
                inputTokens,
            );
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async claimRewardsFarmLockedToken(
        @Args('inputTokens', FarmProxyTokensValidationPipe)
        inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        const simpleLockAddress =
            await this.simpleLockService.getSimpleLockAddressFromInputTokens([
                inputTokens,
            ]);

        return this.simpleLockTransactions.farmClaimRewardsLockedToken(
            simpleLockAddress,
            user.address,
            inputTokens,
        );
    }
}
