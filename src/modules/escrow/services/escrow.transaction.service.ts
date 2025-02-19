import {
    Address,
    AddressValue,
    Token,
    TokenTransfer,
} from '@multiversx/sdk-core';
import { Injectable } from '@nestjs/common';
import { gasConfig } from 'src/config';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { TransactionOptions } from 'src/modules/common/transaction.options';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';

@Injectable()
export class EscrowTransactionService {
    constructor(private readonly mxProxy: MXProxyService) {}

    async withdraw(
        senderAddress: string,
        userAddress: string,
    ): Promise<TransactionModel> {
        return await this.mxProxy.getEscrowSmartContractTransaction(
            new TransactionOptions({
                sender: userAddress,
                gasLimit: gasConfig.escrow.withdraw,
                function: 'withdraw',
                arguments: [
                    new AddressValue(Address.newFromBech32(senderAddress)),
                ],
            }),
        );
    }

    async cancelTransfer(
        senderAddress: string,
        receiverAddress: string,
        userAddress: string,
    ): Promise<TransactionModel> {
        return await this.mxProxy.getEscrowSmartContractTransaction(
            new TransactionOptions({
                sender: userAddress,
                gasLimit: gasConfig.escrow.cancelTransfer,
                function: 'cancelTransfer',
                arguments: [
                    new AddressValue(Address.newFromBech32(senderAddress)),
                    new AddressValue(Address.newFromBech32(receiverAddress)),
                ],
            }),
        );
    }

    async lockFunds(
        senderAddress: string,
        receiverAddress: string,
        payments: InputTokenModel[],
    ): Promise<TransactionModel> {
        if (senderAddress === receiverAddress) {
            throw new Error('Sender and receiver cannot be the same');
        }

        return await this.mxProxy.getEscrowSmartContractTransaction(
            new TransactionOptions({
                sender: senderAddress,
                gasLimit: gasConfig.escrow.lockFunds,
                function: 'lockFunds',
                arguments: [
                    new AddressValue(Address.newFromBech32(receiverAddress)),
                ],
                tokenTransfers: payments.map(
                    (payment) =>
                        new TokenTransfer({
                            token: new Token({
                                identifier: payment.tokenID,
                                nonce: BigInt(payment.nonce),
                            }),
                            amount: BigInt(payment.amount),
                        }),
                ),
            }),
        );
    }
}
