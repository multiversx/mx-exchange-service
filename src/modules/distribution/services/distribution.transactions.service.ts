import { Injectable } from '@nestjs/common';
import { mxConfig, gasConfig } from '../../../config';
import { TransactionModel } from '../../../models/transaction.model';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';

@Injectable()
export class DistributionTransactionsService {
    constructor(private mxProxy: MXProxyService) {}

    async claimLockedAssets(): Promise<TransactionModel> {
        const contract = await this.mxProxy.getDistributionSmartContract();
        return contract.methodsExplicit
            .claimLockedAssets([])
            .withGasLimit(gasConfig.claimLockedAssets)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }
}
