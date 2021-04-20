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
import { elrondConfig, abiConfig } from '../../config';
import { ContextService } from '../utils/context.service';


@Injectable()
export class RouterService {
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

    async getAllPairs(offset: number, limit: number): Promise<PairModel[]> {
        const cachedData = await this.cacheManagerService.getPairs();
        if (!!cachedData) {
            return cachedData.pairs.slice(offset, limit);
        }
        let abiRegistry = await AbiRegistry.load({ files: [abiConfig.router] });
        let abi = new SmartContractAbi(abiRegistry, ["Router"]);
        let contract = new SmartContract({ address: new Address(elrondConfig.routerAddress), abi: abi });

        let getAllPairsAddressesInteraction = <Interaction>contract.methods.getAllPairsAddresses([]);

        let queryResponse = await contract.runQuery(this.proxy, getAllPairsAddressesInteraction.buildQuery());
        let result = getAllPairsAddressesInteraction.interpretQueryResponse(queryResponse);

        let pairs = result.firstValue.valueOf().map(v => {
            let pair = new PairModel();
            pair.address = v.toString();
            return pair;
        });
        this.cacheManagerService.setPairs({ pairs: pairs });
        return pairs.slice(offset, limit);
    }

    async getDexFactory(): Promise<DexFactoryModel> {
        let dexFactory = new DexFactoryModel();
        dexFactory.address = elrondConfig.routerAddress;
        return dexFactory;
    }

    async getPairCount(): Promise<number> {
        const cachedData = await this.cacheManagerService.getPairCount();
        if (!!cachedData) {
            return cachedData.pairCount;
        }

        let pairCount = (await this.context.getPairsMetadata()).length;

        this.cacheManagerService.setPairCount({ pairCount: pairCount });
        return pairCount;
    }

    async getTotalTxCount(): Promise<number> {
        const cachedData = await this.cacheManagerService.getTotalTxCount();
        if (!!cachedData) {
            return cachedData.totalTxCount;
        }

        let totalTxCount = 0;
        let pairs = await this.context.getPairsMetadata();

        for (const pair of pairs) {
            const body = {
                size: 0,
                'query': {
                    'bool': {
                        'must': [
                            {
                                'match': {
                                    'receiver': pair.address
                                }
                            }
                        ]
                    }
                }
            }

            try {
                const response = await this.elasticClient.search({
                    body
                });
                totalTxCount += response.body.hits.total.value;
            } catch (e) {
                console.log(e);
            }

        }

        this.cacheManagerService.setTotalTxCount({ totalTxCount: totalTxCount });
        return totalTxCount;
    }

    async createPair(token_a: string, token_b: string): Promise<TransactionModel> {
        let abiRegistry = await AbiRegistry.load({ files: [abiConfig.router] });
        let abi = new SmartContractAbi(abiRegistry, ["Router"]);
        let contract = new SmartContract({ address: new Address(elrondConfig.routerAddress), abi: abi });
        let transaction = contract.call({
            func: new ContractFunction("createPair"),
            args: [
                BytesValue.fromUTF8(token_a),
                BytesValue.fromUTF8(token_b)
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

    async issueLpToken(address: string, lpTokenName: string, lpTokenTicker: string): Promise<TransactionModel> {
        let abiRegistry = await AbiRegistry.load({ files: [abiConfig.router] });
        let abi = new SmartContractAbi(abiRegistry, ["Router"]);
        let contract = new SmartContract({ address: new Address(elrondConfig.routerAddress), abi: abi });
        let transaction = contract.call({
            func: new ContractFunction("issueLpToken"),
            args: [
                BytesValue.fromHex(new Address(address).hex()),
                BytesValue.fromUTF8(lpTokenName),
                BytesValue.fromUTF8(lpTokenTicker)
            ],
            gasLimit: new GasLimit(1400000000)
        });
        console.log(transaction);
        let transactionModel = transaction.toPlainObject();
        return {
            ...transactionModel,
            options: transactionModel.options == undefined ? "" : transactionModel.options,
            status: transactionModel.status == undefined ? "" : transactionModel.status,
            signature: transactionModel.signature == undefined ? "" : transactionModel.signature
        };
    }

    async setLocalRoles(address: string): Promise<TransactionModel> {
        let abiRegistry = await AbiRegistry.load({ files: [abiConfig.router] });
        let abi = new SmartContractAbi(abiRegistry, ["Router"]);
        let contract = new SmartContract({ address: new Address(elrondConfig.routerAddress), abi: abi });
        let transaction = contract.call({
            func: new ContractFunction("setLocalRoles"),
            args: [
                BytesValue.fromHex(new Address(address).hex()),
            ],
            gasLimit: new GasLimit(1400000000)
        });
        console.log(transaction);
        let transactionModel = transaction.toPlainObject();
        return {
            ...transactionModel,
            options: transactionModel.options == undefined ? "" : transactionModel.options,
            status: transactionModel.status == undefined ? "" : transactionModel.status,
            signature: transactionModel.signature == undefined ? "" : transactionModel.signature
        };
    }
}
