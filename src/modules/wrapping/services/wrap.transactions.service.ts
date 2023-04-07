import { Injectable } from '@nestjs/common';
import { TokenPayment } from '@multiversx/sdk-core';
import { TransactionModel } from '../../../models/transaction.model';
import { mxConfig, gasConfig } from '../../../config';
import { WrapService } from './wrap.service';
import BigNumber from 'bignumber.js';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';

@Injectable()
export class TransactionsWrapService {
    constructor(
        private readonly mxProxy: MXProxyService,
        private readonly wrapService: WrapService,
    ) {}

    async wrapEgld(sender: string, amount: string): Promise<TransactionModel> {
        const shardID = await this.mxProxy.getAddressShardID(sender);
        const contract = await this.mxProxy.getWrapSmartContract(shardID);
        return contract.methodsExplicit
            .wrapEgld()
            .withValue(amount)
            .withGasLimit(gasConfig.wrapeGLD)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unwrapEgld(
        sender: string,
        amount: string,
    ): Promise<TransactionModel> {
        const shardID = await this.mxProxy.getAddressShardID(sender);
        const contract = await this.mxProxy.getWrapSmartContract(shardID);

        const wrappedEgldToken = await this.wrapService.getWrappedEgldToken();

        return contract.methodsExplicit
            .unwrapEgld()
            .withSingleESDTTransfer(
                TokenPayment.fungibleFromBigInteger(
                    wrappedEgldToken.identifier,
                    new BigNumber(amount),
                ),
            )
            .withGasLimit(gasConfig.wrapeGLD)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
