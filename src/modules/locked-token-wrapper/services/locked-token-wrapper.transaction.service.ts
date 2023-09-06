import { Injectable } from '@nestjs/common';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { TransactionModel } from '../../../models/transaction.model';
import { Address, TokenTransfer } from '@multiversx/sdk-core';
import { mxConfig, gasConfig } from '../../../config';
import { BigNumber } from 'bignumber.js';
import { InputTokenModel } from '../../../models/inputToken.model';

@Injectable()
export class LockedTokenWrapperTransactionService {
    constructor(private readonly mxProxy: MXProxyService) {}

    async unwrapLockedToken(
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getLockedTokenWrapperContract();
        return contract.methodsExplicit
            .unwrapLockedToken()
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    inputToken.tokenID,
                    inputToken.nonce,
                    new BigNumber(inputToken.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.lockedTokenWrapper.unwrapLockedToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async wrapLockedToken(
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getLockedTokenWrapperContract();
        return contract.methodsExplicit
            .wrapLockedToken()
            .withSingleESDTNFTTransfer(
                TokenTransfer.metaEsdtFromBigInteger(
                    inputToken.tokenID,
                    inputToken.nonce,
                    new BigNumber(inputToken.amount),
                ),
            )
            .withSender(Address.fromString(sender))
            .withGasLimit(gasConfig.lockedTokenWrapper.wrapLockedToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
