import { TransactionModel } from '../../models/transaction.model';
import { PairModel } from '../pair/models/pair.model';
import { FactoryModel } from '../../models/factory.model';
import { Injectable } from '@nestjs/common';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { Address, GasLimit } from '@elrondnetwork/erdjs';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { Client } from '@elastic/elasticsearch';
import { elrondConfig, scAddress } from '../../config';
import { ContextService } from '../../services/context/context.service';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';

@Injectable()
export class RouterService {
    private readonly elasticClient: Client;

    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly cacheManagerService: CacheManagerService,
        private readonly context: ContextService,
    ) {
        this.elasticClient = new Client({
            node: elrondConfig.elastic + '/transactions',
        });
    }

    async getFactory(): Promise<FactoryModel> {
        const dexFactory = new FactoryModel();
        dexFactory.address = scAddress.routerAddress;
        return dexFactory;
    }

    async getAllPairsAddress(): Promise<string[]> {
        return await this.context.getAllPairsAddress();
    }

    async getAllPairs(offset: number, limit: number): Promise<PairModel[]> {
        const pairsAddress = await this.context.getAllPairsAddress();
        const pairs = pairsAddress.map(pairAddress => {
            const pair = new PairModel();
            pair.address = pairAddress;
            return pair;
        });

        return pairs.slice(offset, limit);
    }

    async getPairCount(): Promise<number> {
        const cachedData = await this.cacheManagerService.getPairCount();
        if (!!cachedData) {
            return cachedData.pairCount;
        }

        const pairCount = (await this.context.getPairsMetadata()).length;

        this.cacheManagerService.setPairCount({ pairCount: pairCount });
        return pairCount;
    }

    async getTotalTxCount(): Promise<number> {
        const cachedData = await this.cacheManagerService.getTotalTxCount();
        if (!!cachedData) {
            return cachedData.totalTxCount;
        }

        let totalTxCount = 0;
        const pairs = await this.context.getPairsMetadata();

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
        const contract = await this.elrondProxy.getRouterSmartContract();

        const createPairInteraction: Interaction = contract.methods.createPair([
            BytesValue.fromUTF8(token0ID),
            BytesValue.fromUTF8(token1ID),
        ]);

        const transaction = createPairInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(50000000));
        return transaction.toPlainObject();
    }

    async issueLpToken(
        pairAddress: string,
        lpTokenName: string,
        lpTokenTicker: string,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const issueLPTokenInteraction: Interaction = contract.methods.issueLPToken(
            [
                BytesValue.fromHex(new Address(pairAddress).hex()),
                BytesValue.fromUTF8(lpTokenName),
                BytesValue.fromUTF8(lpTokenTicker),
            ],
        );

        const transaction = issueLPTokenInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(100000000));
        return transaction.toPlainObject();
    }

    async setLocalRoles(pairAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const setLocalRolesInteraction: Interaction = contract.methods.setLocalRoles(
            [BytesValue.fromHex(new Address(pairAddress).hex())],
        );

        const transaction = setLocalRolesInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(25000000));
        return transaction.toPlainObject();
    }

    async setState(
        address: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const args = [BytesValue.fromHex(new Address(address).hex())];

        const stateInteraction: Interaction = enable
            ? contract.methods.resume(args)
            : contract.methods.pause(args);

        const transaction = stateInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(1000000));
        return transaction.toPlainObject();
    }

    async setFee(
        pairAddress: string,
        feeToAddress: string,
        feeTokenID: string,
        enable: boolean,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getRouterSmartContract();
        const args = [
            BytesValue.fromHex(new Address(pairAddress).hex()),
            BytesValue.fromHex(new Address(feeToAddress).hex()),
            BytesValue.fromUTF8(feeTokenID),
        ];

        const setFeeInteraction: Interaction = enable
            ? contract.methods.setFeeOn([args])
            : contract.methods.setFeeOff([args]);

        const transaction = setFeeInteraction.buildTransaction();
        transaction.setGasLimit(new GasLimit(1000000));
        return transaction.toPlainObject();
    }
}
