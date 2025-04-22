import { Injectable } from '@nestjs/common';
import { Token, TokenTransfer } from '@multiversx/sdk-core';
import { TransactionModel } from '../../../models/transaction.model';
import { mxConfig, gasConfig } from '../../../config';
import { WrapService } from './wrap.service';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { TransactionOptions } from 'src/modules/common/transaction.options';

@Injectable()
export class WrapTransactionsService {
    constructor(
        private readonly mxProxy: MXProxyService,
        private readonly wrapService: WrapService,
    ) {}

    async wrapEgld(sender: string, amount: string): Promise<TransactionModel> {
        const shardID = await this.mxProxy.getAddressShardID(sender);

        return this.mxProxy.getWrapSmartContractTransaction(
            shardID,
            new TransactionOptions({
                function: 'wrapEgld',
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.wrapeGLD,
                sender: sender,
                nativeTransferAmount: amount,
            }),
        );
    }

    async unwrapEgld(
        sender: string,
        amount: string,
    ): Promise<TransactionModel> {
        const [shardID, wrappedEgldToken] = await Promise.all([
            this.mxProxy.getAddressShardID(sender),
            this.wrapService.wrappedEgldToken(),
        ]);

        return this.mxProxy.getWrapSmartContractTransaction(
            shardID,
            new TransactionOptions({
                function: 'unwrapEgld',
                chainID: mxConfig.chainID,
                gasLimit: gasConfig.wrapeGLD,
                sender: sender,
                tokenTransfers: [
                    new TokenTransfer({
                        token: new Token({
                            identifier: wrappedEgldToken.identifier,
                        }),
                        amount: BigInt(amount),
                    }),
                ],
            }),
        );
    }
}
