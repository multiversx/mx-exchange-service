import { Injectable } from '@nestjs/common';
import { mxConfig, gasConfig } from '../../../config';
import { TransactionModel } from '../../../models/transaction.model';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';

@Injectable()
export class TransactionsDistributionService {
    constructor(private elrondProxy: ElrondProxyService) {}

    async claimLockedAssets(): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getDistributionSmartContract();
        return contract.methodsExplicit
            .claimLockedAssets([])
            .withGasLimit(gasConfig.claimLockedAssets)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
