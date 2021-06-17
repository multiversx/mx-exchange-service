import { Injectable } from '@nestjs/common';
import {
    Interaction,
    GasLimit,
    Balance,
    BytesValue,
    BigUIntValue,
} from '@elrondnetwork/erdjs';
import { TransactionModel } from '../../models/transaction.model';
import { gasConfig } from 'src/config';
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

    async wrapEgld(amount: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getWrapSmartContract();
        const interaction: Interaction = contract.methods.wrapEgld([]);
        const transaction = interaction.buildTransaction();
        transaction.setValue(new Balance(amount));
        transaction.setGasLimit(new GasLimit(gasConfig.wrapeGLD));

        return transaction.toPlainObject();
    }

    async unwrapEgld(amount: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getWrapSmartContract();

        const wrappedEgldToken = await this.wrapService.getWrappedEgldToken();

        const args = [
            BytesValue.fromUTF8(wrappedEgldToken.token),
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
