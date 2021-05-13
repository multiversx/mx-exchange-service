import { Injectable } from '@nestjs/common';
import { elrondConfig, abiConfig, gasConfig } from '../../../config';
import {
    AbiRegistry,
    BigUIntValue,
    BytesValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Address, SmartContract, GasLimit } from '@elrondnetwork/erdjs';
import { TransactionModel } from '../../models/transaction.model';
import BigNumber from 'bignumber.js';
import { ContextService } from '../context.service';

import {
    ClaimFarmRewardsProxyArgs,
    EnterFarmProxyArgs,
    ExitFarmProxyArgs,
} from './dto/proxy-farm.args';

@Injectable()
export class ProxyFarmService {
    constructor(private context: ContextService) {}

    private async getContract(): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({
            files: [abiConfig.distribution],
        });
        const abi = new SmartContractAbi(abiRegistry, ['ProxyDexImpl']);
        const contract = new SmartContract({
            address: new Address(elrondConfig.distributionAddress),
            abi: abi,
        });

        return contract;
    }

    async enterFarmProxy(args: EnterFarmProxyArgs): Promise<TransactionModel> {
        const contract = await this.getContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.acceptedLockedTokenID),
            new U32Value(args.acceptedLockedTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('enterFarmProxy'),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = args.sender;

        return transaction;
    }

    async exitFarmProxy(args: ExitFarmProxyArgs): Promise<TransactionModel> {
        const contract = await this.getContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.wrappedFarmTokenID),
            new U32Value(args.wrappedFarmTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('exitFarmProxy'),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = args.sender;

        return transaction;
    }

    async claimFarmRewardsProxy(
        args: ClaimFarmRewardsProxyArgs,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();

        const transactionArgs = [
            BytesValue.fromUTF8(args.wrappedFarmTokenID),
            new U32Value(args.wrappedFarmTokenNonce),
            new BigUIntValue(new BigNumber(args.amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('claimRewardsProxy'),
            BytesValue.fromHex(new Address(args.farmAddress).hex()),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            transactionArgs,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = args.sender;

        return transaction;
    }
}
