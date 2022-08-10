import { Injectable } from '@nestjs/common';
import { elrondConfig, gasConfig } from '../../../config';
import { TransactionModel } from '../../../models/transaction.model';
import { ElrondProxyService } from '../../../services/elrond-communication/services/elrond-proxy.service';

@Injectable()
export class TransactionsDistributionService {
    constructor(private elrondProxy: ElrondProxyService) {}

    async claimLockedAssets(): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getDistributionSmartContract();
        return contract.methodsExplicit
            .claimLockedAssets([])
            .withGasLimit(gasConfig.claimLockedAssets)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
