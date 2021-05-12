import { TransactionModel } from '../models/transaction.model';
import { Injectable } from '@nestjs/common';
import {
    AbiRegistry,
    BigUIntValue,
    U32Value,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import {
    ProxyProvider,
    Address,
    SmartContract,
    GasLimit,
    Interaction,
} from '@elrondnetwork/erdjs';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { Client } from '@elastic/elasticsearch';
import {
    elrondConfig,
    abiConfig,
    farmsConfig,
    gasConfig,
    cacheConfig,
} from '../../config';
import { ContextService } from '../utils/context.service';
import { BigNumber } from 'bignumber.js';
import { TokenModel } from '../models/pair.model';
import { FarmModel } from '../models/farm.model';

const FarmKeys = {
    farmedTokenID: (farmAddress: string) => `${farmAddress}.farmedTokenID`,
    farmTokenID: (farmAddress: string) => `${farmAddress}.farmTokenID`,
    acceptedTokensID: (farmAddress: string) =>
        `${farmAddress}.acceptedTokensID`,
};

@Injectable()
export class FarmService {
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

    private async getContract(farmAddress: string): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({
            files: [abiConfig.farm],
        });
        const abi = new SmartContractAbi(abiRegistry, ['Farm']);
        const contract = new SmartContract({
            address: new Address(farmAddress),
            abi: abi,
        });
        return contract;
    }

    async getFarmedToken(farmAddress: string): Promise<TokenModel> {
        const cachedData = await this.cacheManagerService.get(
            FarmKeys.farmedTokenID(farmAddress),
        );
        if (!!cachedData) {
            return await this.context.getTokenMetadata(
                cachedData.farmedTokenID,
            );
        }

        const contract = await this.getContract(farmAddress);
        const interaction: Interaction = contract.methods.getFarmingPoolTokenId(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);

        const farmedTokenID = response.firstValue.valueOf();
        this.cacheManagerService.set(
            FarmKeys.farmedTokenID(farmAddress),
            { farmedTokenID: farmedTokenID },
            cacheConfig.token,
        );

        return await this.context.getTokenMetadata(farmedTokenID);
    }

    async getFarmToken(farmAddress: string): Promise<TokenModel> {
        const cachedData = await this.cacheManagerService.get(
            FarmKeys.farmTokenID(farmAddress),
        );
        if (!!cachedData) {
            return await this.context.getTokenMetadata(cachedData.farmTokenID);
        }

        const contract = await this.getContract(farmAddress);
        const interaction: Interaction = contract.methods.getFarmTokenId([]);
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);

        const farmTokenID = response.firstValue.valueOf();
        this.cacheManagerService.set(
            FarmKeys.farmTokenID(farmAddress),
            { farmTokenID: farmTokenID },
            cacheConfig.token,
        );

        return await this.context.getTokenMetadata(farmTokenID);
    }

    async getAcceptedTokens(farmAddress: string): Promise<TokenModel[]> {
        const cachedData = await this.cacheManagerService.get(
            FarmKeys.acceptedTokensID(farmAddress),
        );
        if (!!cachedData) {
            const acceptedTokens: TokenModel[] = [];
            for (const tokenID of cachedData.acceptedTokensID) {
                acceptedTokens.push(
                    await this.context.getTokenMetadata(tokenID),
                );
            }

            return acceptedTokens;
        }

        const contract = await this.getContract(farmAddress);
        const interaction: Interaction = contract.methods.getAllAcceptedTokens(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const acceptedTokensID = response.values.map(acceptedTokenID =>
            acceptedTokenID.valueOf(),
        );
        this.cacheManagerService.set(
            FarmKeys.acceptedTokensID(farmAddress),
            { acceptedTokensID: acceptedTokensID },
            cacheConfig.token,
        );

        const acceptedTokens: TokenModel[] = [];
        for (const tokenID of acceptedTokensID) {
            acceptedTokens.push(await this.context.getTokenMetadata(tokenID));
        }

        return acceptedTokens;
    }

    async getState(farmAddress: string): Promise<string> {
        const contract = await this.getContract(farmAddress);
        return await this.context.getState(contract);
    }

    async getFarms(): Promise<FarmModel[]> {
        const farms: Array<FarmModel> = [];
        for (const farmConfig of farmsConfig) {
            const key = Object.keys(farmConfig)[0];
            const farmAddress = farmConfig[key];
            const farm = new FarmModel();
            farm.address = farmAddress;
            farms.push(farm);
        }

        return farms;
    }

    async getRewardsForPosition(
        farmAddress: string,
        farmTokenNonce: number,
        amount: string,
    ): Promise<string> {
        const contract = await this.getContract(farmAddress);
        const farmedToken = await this.getFarmedToken(farmAddress);

        const interaction: Interaction = contract.methods.calculateRewardsForGivenPosition(
            [
                new U32Value(farmTokenNonce),
                new BigUIntValue(new BigNumber(amount)),
            ],
        );

        const qeryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(qeryResponse);

        return this.context
            .fromBigNumber(response.firstValue.valueOf(), farmedToken)
            .toString();
    }

    async enterFarm(
        farmAddress: string,
        tokenInID: string,
        amount: string,
    ): Promise<TransactionModel> {
        const contract = await this.getContract(farmAddress);

        const tokenIn = await this.context.getTokenMetadata(tokenInID);
        const amountDenom = this.context.toBigNumber(amount, tokenIn);

        const args = [
            BytesValue.fromUTF8(tokenInID),
            new BigUIntValue(amountDenom),
            BytesValue.fromUTF8('enterFarm'),
        ];

        return this.context.esdtTransfer(
            contract,
            args,
            new GasLimit(gasConfig.esdtTransfer),
        );
    }

    async exitFarm(
        farmAddress: string,
        sender: string,
        farmTokenID: string,
        farmTokenNonce: number,
        amount: string,
    ): Promise<TransactionModel> {
        const contract = await this.getContract(farmAddress);

        const args = [
            BytesValue.fromUTF8(farmTokenID),
            new U32Value(farmTokenNonce),
            new BigUIntValue(new BigNumber(amount)),
            BytesValue.fromHex(new Address(farmAddress).hex()),
            BytesValue.fromUTF8('exitFarm'),
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
