import { UseGuards } from '@nestjs/common';
import { Args, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { scAddress } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { AuthUser } from '../auth/auth.user';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { UserAuthResult } from '../auth/user.auth.result';
import { EscrowModel } from './models/escrow.model';
import { EscrowGetterService } from './services/escrow.getter.service';
import { EscrowTransactionService } from './services/escrow.transaction.service';

@Resolver(EscrowModel)
export class EscrowResolver extends GenericResolver {
    constructor(
        private readonly escrowGetter: EscrowGetterService,
        private readonly escrowTransaction: EscrowTransactionService,
    ) {
        super();
    }

    @ResolveField()
    async energyFactoryAddress(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.escrowGetter.getEnergyFactoryAddress(),
        );
    }

    @ResolveField()
    async lockedTokenID(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.escrowGetter.getLockedTokenID(),
        );
    }

    @ResolveField()
    async minLockEpochs(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.escrowGetter.getMinLockEpochs(),
        );
    }

    @ResolveField()
    async epochsCooldownDuration(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.escrowGetter.getEpochCooldownDuration(),
        );
    }

    @Query(() => EscrowModel)
    async escrowContract(): Promise<EscrowModel> {
        return new EscrowModel({
            address: scAddress.escrow,
        });
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [ScheduledTransferModel])
    async scheduledTransfers(
        @AuthUser() user: UserAuthResult,
    ): Promise<ScheduledTransferModel[]> {
        return await this.genericQuery(() =>
            this.escrowGetter.getScheduledTransfers(user.address),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [String])
    async senders(@AuthUser() user: UserAuthResult): Promise<string[]> {
        return await this.genericQuery(() =>
            this.escrowGetter.getAllSenders(user.address),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async withdraw(
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.escrowTransaction.withdraw(user.address),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async cancelTransfer(
        @Args('receiver') receiver: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.escrowTransaction.cancelTransfer(user.address, receiver),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async lockFunds(
        @Args('receiver') receiver: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.escrowTransaction.lockFunds(
                user.address,
                receiver,
                inputTokens,
            ),
        );
    }
}
