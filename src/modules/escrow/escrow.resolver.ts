import { UseGuards } from '@nestjs/common';
import { Args, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { scAddress } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { AuthUser } from '../auth/auth.user';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { UserAuthResult } from '../auth/user.auth.result';
import {
    EscrowModel,
    SCPermissions,
    ScheduledTransferModel,
} from './models/escrow.model';
import { EscrowTransactionService } from './services/escrow.transaction.service';
import { SenderCooldownValidator } from './validators/sender.cooldown.validator';
import { TransferTokensValidator } from './validators/transfer.tokens.validator';
import { EscrowAdminValidator } from './validators/admin.validator';
import { ForbiddenError } from 'apollo-server-express';
import { EscrowAbiService } from './services/escrow.abi.service';

@Resolver(EscrowModel)
export class EscrowResolver extends GenericResolver {
    constructor(
        private readonly escrowAbi: EscrowAbiService,
        private readonly escrowTransaction: EscrowTransactionService,
    ) {
        super();
    }

    @ResolveField()
    async energyFactoryAddress(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.escrowAbi.energyFactoryAddress(),
        );
    }

    @ResolveField()
    async lockedTokenID(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.escrowAbi.lockedTokenID(),
        );
    }

    @ResolveField()
    async minLockEpochs(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.escrowAbi.minLockEpochs(),
        );
    }

    @ResolveField()
    async epochsCooldownDuration(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.escrowAbi.epochsCooldownDuration(),
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
            this.escrowAbi.scheduledTransfers(user.address),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [String], {
        description: 'Get all senders for a given receiver',
    })
    async escrowSenders(@AuthUser() user: UserAuthResult): Promise<string[]> {
        return await this.genericQuery(() =>
            this.escrowAbi.allSenders(user.address),
        );
    }
    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [String], {
        description: 'Get all receivers for a given sender',
    })
    async escrowReceivers(
        @AuthUser() user: UserAuthResult,
        @Args('sender', { nullable: true })
        sender: string,
    ): Promise<string[]> {
        let address = user.address;
        if (sender) {
            const permissions = await this.escrowAbi.addressPermission(
                user.address,
            );
            if (permissions.includes(SCPermissions.ADMIN)) {
                address = sender;
            } else {
                throw new ForbiddenError('Only admins can query other senders');
            }
        }
        return await this.genericQuery(() =>
            this.escrowAbi.allReceivers(address),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => Number, { nullable: true })
    async senderLastTransferEpoch(
        @AuthUser() user: UserAuthResult,
    ): Promise<number> {
        return await this.genericQuery(async () => {
            const value = await this.escrowAbi.senderLastTransferEpoch(
                user.address,
            );
            return value > 0 ? value : undefined;
        });
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => Number, { nullable: true })
    async receiverLastTransferEpoch(
        @AuthUser() user: UserAuthResult,
        @Args('receiver', { nullable: true }) receiver: string,
    ): Promise<number> {
        return await this.genericQuery(async () => {
            const value = await this.escrowAbi.receiverLastTransferEpoch(
                receiver ?? user.address,
            );
            return value > 0 ? value : undefined;
        });
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async escrowReceive(
        @Args('senderAddress') senderAddress: string,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.escrowTransaction.withdraw(senderAddress),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async cancelEscrowTransfer(
        @Args('sender') sender: string,
        @Args('receiver') receiver: string,
        @AuthUser(EscrowAdminValidator) _user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.escrowTransaction.cancelTransfer(sender, receiver),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async escrowTransfer(
        @Args('receiver') receiver: string,
        @Args(
            'inputTokens',
            { type: () => [InputTokenModel] },
            TransferTokensValidator,
        )
        inputTokens: InputTokenModel[],
        @AuthUser(SenderCooldownValidator) user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.escrowTransaction.lockFunds(
                user.address,
                receiver,
                inputTokens,
            ),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [SCPermissions], { description: 'Get address permissions' })
    async escrowPermissions(
        @AuthUser() user: UserAuthResult,
    ): Promise<SCPermissions[]> {
        return await this.genericQuery(() =>
            this.escrowAbi.addressPermission(user.address),
        );
    }
}
