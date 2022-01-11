import { Injectable } from '@nestjs/common';
import { GasLimit } from '@elrondnetwork/erdjs';
import { elrondConfig, gasConfig } from '../../../config';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { TransactionModel } from '../../../models/transaction.model';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';

@Injectable()
export class TransactionsDistributionService {
    constructor(private elrondProxy: ElrondProxyService) {}

    async claimLockedAssets(): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getDistributionSmartContract();
        const interaction: Interaction = contract.methods.claimLockedAssets([]);
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.claimLockedAssets));

        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }
}
