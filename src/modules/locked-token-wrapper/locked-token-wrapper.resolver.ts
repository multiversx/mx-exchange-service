import { Args, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { LockedTokenWrapperTransactionService } from './services/locked-token-wrapper.transaction.service';
import { LockedTokenWrapperModel } from './models/locked-token-wrapper.model';
import { scAddress } from '../../config';
import { UseGuards } from '@nestjs/common';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { TransactionModel } from '../../models/transaction.model';
import { InputTokenModel } from '../../models/inputToken.model';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { LockedTokenWrapperAbiService } from './services/locked-token-wrapper.abi.service';
import { EnergyAbiService } from '../energy/services/energy.abi.service';

@Resolver(() => LockedTokenWrapperModel)
export class LockedTokenWrapperResolver {
    constructor(
        private readonly lockedTokenWrapperTransactionService: LockedTokenWrapperTransactionService,
        private readonly lockedTokenWrapperAbi: LockedTokenWrapperAbiService,
        private readonly energyAbi: EnergyAbiService,
    ) {}

    @ResolveField()
    async lockedTokenId(): Promise<string> {
        return this.energyAbi.lockedTokenID();
    }

    @ResolveField()
    async wrappedTokenId(): Promise<string> {
        return this.lockedTokenWrapperAbi.wrappedTokenId();
    }

    @ResolveField()
    async energyFactoryAddress(): Promise<string> {
        return this.lockedTokenWrapperAbi.energyFactoryAddress();
    }

    @Query(() => LockedTokenWrapperModel)
    lockedTokenWrapper(): LockedTokenWrapperModel {
        return new LockedTokenWrapperModel({
            address: scAddress.lockedTokenWrapper,
        });
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async unwrapLockedToken(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.lockedTokenWrapperTransactionService.unwrapLockedToken(
            user.address,
            inputTokens,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async wrapLockedToken(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.lockedTokenWrapperTransactionService.wrapLockedToken(
            user.address,
            inputTokens,
        );
    }
}
