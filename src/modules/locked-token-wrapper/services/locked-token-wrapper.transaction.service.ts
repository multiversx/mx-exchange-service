import { Injectable } from '@nestjs/common';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { TransactionModel } from '../../../models/transaction.model';
import { Address, TokenPayment } from '@multiversx/sdk-core';
import { mxConfig, gasConfig } from '../../../config';
import { BigNumber } from 'bignumber.js';
import { InputTokenModel } from '../../../models/inputToken.model';

@Injectable()
export class LockedTokenWrapperTransactionService {
    constructor(private readonly elrondProxy: ElrondProxyService) {}

    async unwrapLockedToken(
        scAddress: string,
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getLockedTokenWrapperContract(
            scAddress,
        );
        return contract.methodsExplicit
            .unwrapLockedToken()
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    inputToken.tokenID,
                    inputToken.nonce,
                    new BigNumber(inputToken.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.lockedTokenWrapper.unwrapLockedToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async wrapLockedToken(
        scAddress: string,
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getLockedTokenWrapperContract(
            scAddress,
        );
        return contract.methodsExplicit
            .wrapLockedToken()
            .withSingleESDTNFTTransfer(
                TokenPayment.metaEsdtFromBigInteger(
                    inputToken.tokenID,
                    inputToken.nonce,
                    new BigNumber(inputToken.amount),
                ),
                Address.fromString(sender),
            )
            .withGasLimit(gasConfig.lockedTokenWrapper.wrapLockedToken)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
