import { Injectable } from '@nestjs/common';
import { TokenPayment } from '@elrondnetwork/erdjs';
import { TransactionModel } from '../../models/transaction.model';
import { elrondConfig, gasConfig } from '../../config';
import { WrapService } from './wrap.service';
import BigNumber from 'bignumber.js';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';

@Injectable()
export class TransactionsWrapService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly wrapService: WrapService,
    ) {}

    async wrapEgld(sender: string, amount: string): Promise<TransactionModel> {
        const shardID = await this.elrondProxy.getAddressShardID(sender);
        const contract = await this.elrondProxy.getWrapSmartContract(shardID);
        return contract.methodsExplicit
            .wrapEgld()
            .withValue(amount)
            .withGasLimit(gasConfig.wrapeGLD)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async unwrapEgld(
        sender: string,
        amount: string,
    ): Promise<TransactionModel> {
        const shardID = await this.elrondProxy.getAddressShardID(sender);
        const contract = await this.elrondProxy.getWrapSmartContract(shardID);

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
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
