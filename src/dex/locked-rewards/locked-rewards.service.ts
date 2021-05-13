import { Injectable } from '@nestjs/common';
import {
    ProxyProvider,
    Address,
    SmartContract,
    GasLimit,
} from '@elrondnetwork/erdjs';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { elrondConfig, abiConfig, gasConfig } from '../../config';
import { ContextService } from '../utils/context.service';
import {
    AbiRegistry,
    BigUIntValue,
    BytesValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { TransactionModel } from '../models/transaction.model';
import { BigNumber } from 'bignumber.js';
import { LockOptionModel } from '../models/locked-rewards.model';

@Injectable()
export class LockedRewardsService {
    private readonly proxy: ProxyProvider;

    constructor(
        private cacheManagerService: CacheManagerService,
        private context: ContextService,
    ) {
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
    }

    async getContract(): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({
            files: [abiConfig.lockedRewards],
        });
        const abi = new SmartContractAbi(abiRegistry, ['LockedRewardsImpl']);
        const contract = new SmartContract({
            address: new Address(elrondConfig.distributionAddress),
            abi: abi,
        });

        return contract;
    }

    async getAllLockRewardOptions(): Promise<LockOptionModel[]> {
        const contract = await this.getContract();
        const interaction: Interaction = contract.methods.getAllLockRewardOptions(
            [],
        );
        const qeryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(qeryResponse);

        return response.values.map(lockOption => {
            const rawLockOption = lockOption.valueOf();
            return {
                epochs: rawLockOption[0],
                interest: rawLockOption[1],
            };
        });
    }

    async lockRewardsTokens(
        tokenID: string,
        amount: string,
        lockTimeEpochs: number,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();
        const token = await this.context.getTokenMetadata(tokenID);

        const args = [
            BytesValue.fromUTF8(tokenID),
            new BigUIntValue(this.context.toBigNumber(amount, token)),
            BytesValue.fromUTF8('lockMexTokens'),
            new U32Value(lockTimeEpochs),
        ];

        return this.context.esdtTransfer(
            contract,
            args,
            new GasLimit(gasConfig.esdtTransfer),
        );
    }

    async unlockRewardsTokens(
        sender: string,
        lockTokenID: string,
        lockTokenNonce: number,
        amount: string,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();

        const args = [
            BytesValue.fromUTF8(lockTokenID),
            new U32Value(lockTokenNonce),
            new BigUIntValue(new BigNumber(amount)),
            BytesValue.fromHex(contract.getAddress().hex()),
            BytesValue.fromUTF8('unlockAssets'),
        ];

        const transaction = await this.context.nftTransfer(
            contract,
            args,
            new GasLimit(gasConfig.esdtTransfer),
        );

        transaction.receiver = sender;

        return transaction;
    }
}
