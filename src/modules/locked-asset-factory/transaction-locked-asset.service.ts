import { Injectable } from '@nestjs/common';
import { GasLimit } from '@elrondnetwork/erdjs';
import { gasConfig } from '../../config';
import {
    BigUIntValue,
    BytesValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { TransactionModel } from '../../models/transaction.model';
import { BigNumber } from 'bignumber.js';
import { UnlockAssetsArs } from './models/locked-asset.args';
import { ContextService } from '../../services/context/context.service';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';

@Injectable()
export class TransactionsLockedAssetService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly context: ContextService,
    ) {}

    async unlockAssets(args: UnlockAssetsArs): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getLockedAssetFactorySmartContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.lockedTokenID),
            new U32Value(args.lockedTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('unlockAssets'),
        ];

        const transaction = this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.unlockAssets),
        );

        transaction.receiver = args.sender;

        return transaction;
    }
}
