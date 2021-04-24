import { TransactionModel } from '../models/transaction.model';
import { Injectable, Res } from '@nestjs/common';
import { AbiRegistry, BigUIntValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem";
import { BytesValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes";
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { ProxyProvider, Address, SmartContract, GasLimit } from '@elrondnetwork/erdjs';
import { CacheManagerService } from 'src/services/cache-manager/cache-manager.service';
import { Client } from '@elastic/elasticsearch';
import { elrondConfig, abiConfig, farmingConfig } from '../../config';
import { ContextService } from '../utils/context.service';
import { BigNumber } from 'bignumber.js';


@Injectable()
export class StakingService {
    private readonly proxy: ProxyProvider;
    private readonly elasticClient: Client;

    constructor(
        private cacheManagerService: CacheManagerService,
        private context: ContextService,
    ) {
        this.proxy = new ProxyProvider(elrondConfig.gateway, 60000);
        this.elasticClient = new Client({
            node: elrondConfig.elastic + '/transactions',
        });
    }

    private async getContract(farmTokenID): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({ files: [abiConfig.staking] });
        const abi = new SmartContractAbi(abiRegistry, ["Staking"]);
        const contract = new SmartContract({ address: new Address(farmingConfig.get(farmTokenID)), abi: abi });
        return contract;
    }

    async stake(tokenID: string, amount: string): Promise<TransactionModel> {
        const contract = await this.getContract(tokenID);

        const token = await this.context.getTokenMetadata(tokenID);
        const amountDenom = new BigNumber(`${amount}e${token.decimals.toString()}`);

        const args = [
            BytesValue.fromUTF8(tokenID),
            new BigUIntValue(amountDenom),
        ];

        return this.context.esdtTransfer(contract, args, new GasLimit(1000000));
    }
}
