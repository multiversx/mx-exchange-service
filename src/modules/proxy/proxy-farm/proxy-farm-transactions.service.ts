import { Injectable } from '@nestjs/common';
import { gasConfig } from '../../../config';
import {
    BigUIntValue,
    BytesValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { Address, GasLimit } from '@elrondnetwork/erdjs';
import { TransactionModel } from '../../../models/transaction.model';
import BigNumber from 'bignumber.js';

import {
    ClaimFarmRewardsProxyArgs,
    CompoundRewardsProxyArgs,
    EnterFarmProxyArgs,
    ExitFarmProxyArgs,
} from '../models/proxy-farm.args';
import { ContextService } from '../../../services/context/context.service';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';

@Injectable()
export class TransactionsProxyFarmService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly context: ContextService,
    ) {}

    async enterFarmProxy(args: EnterFarmProxyArgs): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();
        const method = args.lockRewards
            ? 'enterFarmAndLockRewardsProxy'
            : 'enterFarmProxy';

        const transactionArgs = [
            BytesValue.fromUTF8(args.acceptedLockedTokenID),
            new U32Value(args.acceptedLockedTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8(method),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const transaction = this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.enterFarmProxy),
        );

        transaction.receiver = args.sender;

        return transaction;
    }

    async exitFarmProxy(args: ExitFarmProxyArgs): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.wrappedFarmTokenID),
            new U32Value(args.wrappedFarmTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('exitFarmProxy'),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const transaction = this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.exitFarmProxy),
        );

        transaction.receiver = args.sender;

        return transaction;
    }

    async claimFarmRewardsProxy(
        args: ClaimFarmRewardsProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.wrappedFarmTokenID),
            new U32Value(args.wrappedFarmTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('claimRewardsProxy'),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const transaction = this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.claimRewardsProxy),
        );

        transaction.receiver = args.sender;

        return transaction;
    }

    async compoundRewardsProxy(
        args: CompoundRewardsProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getProxyDexSmartContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.tokenID),
            new U32Value(args.tokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('compoundRewardsProxy'),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const transaction = this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.compoundRewardsProxy),
        );

        transaction.receiver = args.sender;

        return transaction;
    }
}
