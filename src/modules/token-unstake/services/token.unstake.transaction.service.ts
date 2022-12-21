import { Injectable } from '@nestjs/common';
import { elrondConfig, gasConfig } from 'src/config';
import { TransactionModel } from 'src/models/transaction.model';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';

@Injectable()
export class TokenUnstakeTransactionService {
    constructor(private readonly elrondProxy: ElrondProxyService) {}

    async claimUnlockedTokens(): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getTokenUnstakeContract();

        return contract.methodsExplicit
            .claimUnlockedTokens()
            .withChainID(elrondConfig.chainID)
            .withGasLimit(gasConfig.tokenUnstake.claimUnlockedTokens)
            .buildTransaction()
            .toPlainObject();
    }

    async cancelUnbond(): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getTokenUnstakeContract();
        return contract.methodsExplicit
            .cancelUnbond()
            .withChainID(elrondConfig.chainID)
            .withGasLimit(gasConfig.tokenUnstake.cancelUnbond)
            .buildTransaction()
            .toPlainObject();
    }
}
