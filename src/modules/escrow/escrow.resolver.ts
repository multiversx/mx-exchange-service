import { UseGuards } from '@nestjs/common';
import { Args, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { scAddress } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
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
import { ForbiddenError } from '@nestjs/apollo';
import { EscrowAbiService } from './services/escrow.abi.service';

@Resolver(EscrowModel)
export class EscrowResolver {
    constructor(
        private readonly escrowAbi: EscrowAbiService,
        private readonly escrowTransaction: EscrowTransactionService,
    ) {}

    @ResolveField()
    async energyFactoryAddress(): Promise<string> {
        return this.escrowAbi.energyFactoryAddress();
    }

    @ResolveField()
    async lockedTokenID(): Promise<string> {
        return this.escrowAbi.lockedTokenID();
    }

    @ResolveField()
    async minLockEpochs(): Promise<number> {
        return this.escrowAbi.minLockEpochs();
    }

    @ResolveField()
    async epochsCooldownDuration(): Promise<number> {
        return this.escrowAbi.epochsCooldownDuration();
    }

    @Query(() => EscrowModel)
    async escrowContract(): Promise<EscrowModel> {
        return new EscrowModel({
            address: scAddress.escrow,
        });
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [ScheduledTransferModel], {
        description: 'Get all scheduled transfers for a given user',
    })
    async scheduledTransfers(
        @AuthUser() user: UserAuthResult,
    ): Promise<ScheduledTransferModel[]> {
        return this.escrowAbi.scheduledTransfers(user.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [String], {
        description: 'Get all senders for a given receiver',
    })
    async escrowSenders(@AuthUser() user: UserAuthResult): Promise<string[]> {
        return this.escrowAbi.allSenders(user.address);
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
        return this.escrowAbi.allReceivers(address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => Number, {
        nullable: true,
        description: 'Get sender last transfer epoch; used for cooldown period',
    })
    async senderLastTransferEpoch(
        @AuthUser() user: UserAuthResult,
    ): Promise<number> {
        const value = await this.escrowAbi.senderLastTransferEpoch(
            user.address,
        );
        return value > 0 ? value : undefined;
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => Number, { nullable: true })
    async receiverLastTransferEpoch(
        @AuthUser() user: UserAuthResult,
        @Args('receiver', {
            nullable: true,
            description:
                'Get receiver last transfer epoch; used for cooldown period',
        })
        receiver: string,
    ): Promise<number> {
        const value = await this.escrowAbi.receiverLastTransferEpoch(
            receiver ?? user.address,
        );
        return value > 0 ? value : undefined;
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel, {
        description: 'Generate transaction to receive escrowed tokens',
    })
    async escrowReceive(
        @Args('senderAddress') senderAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.escrowTransaction.withdraw(senderAddress, user.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel, {
        description:
            'Generate transaction to cancel escrowed transfers; used only by admins',
    })
    async cancelEscrowTransfer(
        @Args('sender') sender: string,
        @Args('receiver') receiver: string,
        @AuthUser(EscrowAdminValidator) user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.escrowTransaction.cancelTransfer(
            sender,
            receiver,
            user.address,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel, {
        description: 'Generate transaction to lock tokens in escrow',
    })
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
        return this.escrowTransaction.lockFunds(
            user.address,
            receiver,
            inputTokens,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [SCPermissions], { description: 'Get address permissions' })
    async escrowPermissions(
        @AuthUser() user: UserAuthResult,
    ): Promise<SCPermissions[]> {
        return this.escrowAbi.addressPermission(user.address);
    }
}
