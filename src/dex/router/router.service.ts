import { TransactionModel } from '../models/transaction.model';
import { PairModel } from '../models/pair.model';
import { FactoryModel } from '../models/factory.model';
import { Injectable, Res } from '@nestjs/common';
import {
    AbiRegistry,
    BigUIntValue,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import {
    ProxyProvider,
    Address,
    SmartContract,
    GasLimit,
} from '@elrondnetwork/erdjs';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { Client } from '@elastic/elasticsearch';
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

    private async getContract(): Promise<SmartContract> {
        let abiRegistry = await AbiRegistry.load({ files: [abiConfig.router] });
        let abi = new SmartContractAbi(abiRegistry, ['Router']);
        let contract = new SmartContract({
            address: new Address(elrondConfig.routerAddress),
            abi: abi,
        });

        return contract;
    }

    async getAllPairs(offset: number, limit: number): Promise<PairModel[]> {
        const cachedData = await this.cacheManagerService.getPairs();
        if (!!cachedData) {
            return cachedData.pairs.slice(offset, limit);
        }
        const contract = await this.getContract();
        let getAllPairsAddressesInteraction = <Interaction>(
            contract.methods.getAllPairsAddresses([])
        );

        let queryResponse = await contract.runQuery(
            this.proxy,
            getAllPairsAddressesInteraction.buildQuery(),
        );
        let result = getAllPairsAddressesInteraction.interpretQueryResponse(
            queryResponse,
        );

        let pairs = result.firstValue.valueOf().map(v => {
            let pair = new PairModel();
            pair.address = v.toString();
            return pair;
        });
        this.cacheManagerService.setPairs({ pairs: pairs });
        return pairs.slice(offset, limit);
    }

    async getFactory(): Promise<FactoryModel> {
        let dexFactory = new FactoryModel();
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
                query: {
                    bool: {
                        must: [
                            {
                                match: {
                                    receiver: pair.address,
                                },
                            },
                        ],
                    },
                },
            };

            try {
                const response = await this.elasticClient.search({
                    body,
                });
                totalTxCount += response.body.hits.total.value;
            } catch (e) {
                console.log(e);
            }
        }

        this.cacheManagerService.setTotalTxCount({
            totalTxCount: totalTxCount,
        });
        return totalTxCount;
    }

    async createPair(
        token0ID: string,
        token1ID: string,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();

        const createPairInteraction = <Interaction>(
            contract.methods.createPair([
                BytesValue.fromUTF8(token0ID),
                BytesValue.fromUTF8(token1ID),
            ])
        );

        let transaction = createPairInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(50000000));
        return transaction.toPlainObject();
    }

    async issueLpToken(
        pairAddress: string,
        lpTokenName: string,
        lpTokenTicker: string,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();
        const issueLPTokenInteraction = <Interaction>(
            contract.methods.issueLPToken([
                BytesValue.fromHex(new Address(pairAddress).hex()),
                BytesValue.fromUTF8(lpTokenName),
                BytesValue.fromUTF8(lpTokenTicker),
            ])
        );

        let transaction = issueLPTokenInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(100000000));
        return transaction.toPlainObject();
    }

    async setLocalRoles(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.getContract();
        const setLocalRolesInteraction = <Interaction>(
            contract.methods.setLocalRoles([
                BytesValue.fromHex(new Address(pairAddress).hex()),
            ])
        );

        let transaction = setLocalRolesInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(25000000));
        return transaction.toPlainObject();
    }

    async setState(
        address: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();
        const args = [BytesValue.fromHex(new Address(address).hex())];

        const stateInteraction = enable
            ? <Interaction>contract.methods.resume(args)
            : <Interaction>contract.methods.pause(args);

        let transaction = stateInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(1000000));
        return transaction.toPlainObject();
    }

    async setFee(
        pairAddress: string,
        feeToAddress: string,
        feeTokenID: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.getContract();
        const args = [
            BytesValue.fromHex(new Address(pairAddress).hex()),
            BytesValue.fromHex(new Address(feeToAddress).hex()),
            BytesValue.fromUTF8(feeTokenID),
        ];

        const setFeeInteraction = enable
            ? <Interaction>contract.methods.setFeeOn([args])
            : <Interaction>contract.methods.setFeeOff([args]);

        let transaction = setFeeInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(1000000));
        return transaction.toPlainObject();
    }
}
