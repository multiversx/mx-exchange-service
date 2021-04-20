import { TransactionModel } from '../dex.model';
import { PairModel } from '../models/pair.model';
import { DexFactoryModel } from '../models/factory.model';
import { Injectable, Res } from '@nestjs/common';
import { AbiRegistry, BigUIntValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem";
import { BytesValue } from "@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes";
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ContractFunction, ProxyProvider, Address, SmartContract, GasLimit } from '@elrondnetwork/erdjs';
import { CacheManagerService } from 'src/services/cache-manager/cache-manager.service';
import { ApiResponse, Client } from '@elastic/elasticsearch';
import { elrondConfig, abiConfig, farmingConfig } from '../../config';
import { ContextService } from '../utils/context.service';
import BigNumber from '@elrondnetwork/erdjs/node_modules/bignumber.js';


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

    async stake(tokenID: string, amount: string): Promise<TransactionModel> {
        let token = await this.context.getTokenMetadata(tokenID);
        let tokenAmount = amount + 'e' + token.decimals.toString();
        let abiRegistry = await AbiRegistry.load({ files: [abiConfig.staking] });
        let abi = new SmartContractAbi(abiRegistry, ["Staking"]);
        let contract = new SmartContract({ address: new Address(farmingConfig.get(tokenID)), abi: abi });

        let transaction = contract.call({
            func: new ContractFunction("ESDTTransfer"),
            args: [
                BytesValue.fromUTF8(tokenID),
                new BigUIntValue(new BigNumber(tokenAmount)),
                BytesValue.fromUTF8("stake"),

            ],
            gasLimit: new GasLimit(1400000000)
        });

        let transactionModel = transaction.toPlainObject();
        return {
            ...transactionModel,
            options: transactionModel.options == undefined ? "" : transactionModel.options,
            status: transactionModel.status == undefined ? "" : transactionModel.status,
            signature: transactionModel.signature == undefined ? "" : transactionModel.signature
        };
    }
}