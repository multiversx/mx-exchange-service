import { Injectable } from '@nestjs/common';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { LockedTokenWrapperModel } from '../models/locked-token-wrapper.model';
import { TransactionModel } from '../../../models/transaction.model';
import { Address, TokenPayment } from '@elrondnetwork/erdjs/out';
import { elrondConfig, gasConfig } from '../../../config';
import { BigNumber } from 'bignumber.js';
import { InputTokenModel } from '../../../models/inputToken.model';


@Injectable()
export class LockedTokenWrapperService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
    ) {
    }

    async lockedTokenWrapper(address: string): Promise<LockedTokenWrapperModel> {
        return new LockedTokenWrapperModel({
            address: address,
        });
    }

    async unwrapLockedToken(
        scAddress: string,
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getLockedTokenWrapperContract(scAddress);
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
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async wrapLockedToken(
        scAddress: string,
        sender: string,
        inputToken: InputTokenModel,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getLockedTokenWrapperContract(scAddress);
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
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
