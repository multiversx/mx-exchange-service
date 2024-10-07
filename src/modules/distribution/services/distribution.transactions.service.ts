import { Injectable } from '@nestjs/common';
import { gasConfig } from '../../../config';
import { TransactionModel } from '../../../models/transaction.model';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { TransactionOptions } from 'src/modules/common/transaction.options';

@Injectable()
export class DistributionTransactionsService {
    constructor(private mxProxy: MXProxyService) {}

    async claimLockedAssets(sender: string): Promise<TransactionModel> {
        return await this.mxProxy.getDistributionSmartContractTransaction(
            new TransactionOptions({
                sender: sender,
                gasLimit: gasConfig.claimLockedAssets,
                function: 'claimLockedAssets',
            }),
        );
    }
}
