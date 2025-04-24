import { Injectable } from '@nestjs/common';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { TransactionModel } from '../../../models/transaction.model';
import { Token, TokenTransfer } from '@multiversx/sdk-core';
import { gasConfig } from '../../../config';
import { InputTokenModel } from '../../../models/inputToken.model';
import { TransactionOptions } from 'src/modules/common/transaction.options';

@Injectable()
export class LockedTokenWrapperTransactionService {
    constructor(private readonly mxProxy: MXProxyService) {}

    async unwrapLockedToken(
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        return this.mxProxy.getLockedTokenWrapperSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.lockedTokenWrapper.unwrapLockedToken,
                function: 'unwrapLockedToken',
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: inputToken.tokenID,
                            nonce: BigInt(inputToken.nonce),
                        }),
                        amount: BigInt(inputToken.amount),
                    }),
                ],
            }),
        );
    }

    async wrapLockedToken(
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        return this.mxProxy.getLockedTokenWrapperSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.lockedTokenWrapper.wrapLockedToken,
                function: 'wrapLockedToken',
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: inputToken.tokenID,
                            nonce: BigInt(inputToken.nonce),
                        }),
                        amount: BigInt(inputToken.amount),
                    }),
                ],
            }),
        );
    }
}
