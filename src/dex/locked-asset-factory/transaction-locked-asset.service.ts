import { Injectable } from '@nestjs/common';
import { GasLimit } from '@elrondnetwork/erdjs';
import { gasConfig } from '../../config';
import { ContextService } from '../utils/context.service';
import {
    BigUIntValue,
    BytesValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { TransactionModel } from '../models/transaction.model';
import { BigNumber } from 'bignumber.js';
import { AbiLockedAssetService } from './abi-locked-asset.service';
import { UnlockAssetsArs } from './dto/locked-asset.args';

@Injectable()
export class TransactionsLockedAssetService {
    constructor(
        private abiService: AbiLockedAssetService,
        private context: ContextService,
    ) {}

    async unlockAssets(args: UnlockAssetsArs): Promise<TransactionModel> {
        const contract = await this.abiService.getContract();

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
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = args.sender;

        return transaction;
    }
}
