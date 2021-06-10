import { Injectable } from '@nestjs/common';
import { GasLimit } from '@elrondnetwork/erdjs';
import { gasConfig } from '../../config';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { TransactionModel } from '../models/transaction.model';
import { AbiDistributionService } from './abi-distribution.service';

@Injectable()
export class TransactionsDistributionService {
    constructor(private abiService: AbiDistributionService) {}

    async claimLockedAssets(): Promise<TransactionModel> {
        const contract = await this.abiService.getContract();
        const interaction: Interaction = contract.methods.claimLockedAssets([]);
        const transaction = interaction.buildTransaction();
        transaction.setGasLimit(new GasLimit(gasConfig.claimLockedAssets));

        return transaction.toPlainObject();
    }
}
