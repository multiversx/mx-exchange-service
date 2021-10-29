import { Injectable } from '@nestjs/common';
import {
    Interaction,
    GasLimit,
    Balance,
    BytesValue,
    BigUIntValue,
} from '@elrondnetwork/erdjs';
import { TransactionModel } from '../../models/transaction.model';
import { elrondConfig, gasConfig } from '../../config';
import { WrapService } from './wrap.service';
import BigNumber from 'bignumber.js';
import { ContextService } from '../../services/context/context.service';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';

@Injectable()
export class TransactionsWrapService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly wrapService: WrapService,
        private readonly context: ContextService,
    ) {}

    async wrapEgld(sender: string, amount: string): Promise<TransactionModel> {
        const shardID = await this.elrondProxy.getAddressShardID(sender);
        const contract = await this.elrondProxy.getWrapSmartContract(shardID);
        const interaction: Interaction = contract.methods.wrapEgld([]);
        const transaction = interaction.buildTransaction();
        transaction.setValue(Balance.fromString(amount));
        transaction.setGasLimit(new GasLimit(gasConfig.wrapeGLD));

        return {
            ...transaction.toPlainObject(),
            chainID: elrondConfig.chainID,
        };
    }

    async unwrapEgld(
        sender: string,
        amount: string,
    ): Promise<TransactionModel> {
        const shardID = await this.elrondProxy.getAddressShardID(sender);
        const contract = await this.elrondProxy.getWrapSmartContract(shardID);

        const wrappedEgldToken = await this.wrapService.getWrappedEgldToken();

        const args = [
            BytesValue.fromUTF8(wrappedEgldToken.identifier),
            new BigUIntValue(new BigNumber(amount)),
            BytesValue.fromUTF8('unwrapEgld'),
        ];

        return this.context.esdtTransfer(
            contract,
            args,
            new GasLimit(gasConfig.wrapeGLD),
        );
    }
}
