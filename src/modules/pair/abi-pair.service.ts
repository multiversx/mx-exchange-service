import { Injectable } from '@nestjs/common';
import { AbiRegistry } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { SmartContractAbi } from '@elrondnetwork/erdjs/out/smartcontracts/abi';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { ProxyProvider, Address, SmartContract } from '@elrondnetwork/erdjs';
import { elrondConfig, abiConfig } from '../../config';
import { PairInfoModel } from '../../models/pair-info.model';

@Injectable()
export class AbiPairService {
    private readonly proxy: ProxyProvider;

    constructor() {
        this.proxy = new ProxyProvider(
            elrondConfig.elrondApi,
            elrondConfig.proxyTimeout,
        );
    }

    async getContract(address: string): Promise<SmartContract> {
        const abiRegistry = await AbiRegistry.load({ files: [abiConfig.pair] });
        const abi = new SmartContractAbi(abiRegistry, ['Pair']);
        const contract = new SmartContract({
            address: new Address(address),
            abi: abi,
        });

        return contract;
    }

    async getFirstTokenID(pairAddress: string): Promise<string> {
        const contract = await this.getContract(pairAddress);
        const interaction: Interaction = contract.methods.getFirstTokenId([]);
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const firstTokenID = response.firstValue.valueOf().toString();

        return firstTokenID;
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        const contract = await this.getContract(pairAddress);
        const interaction: Interaction = contract.methods.getSecondTokenId([]);
        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const secondTokenID = response.firstValue.valueOf().toString();

        return secondTokenID;
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        const contract = await this.getContract(pairAddress);
        const getLpTokenInteraction: Interaction = contract.methods.getLpTokenIdentifier(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.proxy,
            getLpTokenInteraction.buildQuery(),
        );
        const response = getLpTokenInteraction.interpretQueryResponse(
            queryResponse,
        );

        const lpTokenID = response.firstValue.valueOf().toString();

        return lpTokenID;
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const contract = await this.getContract(pairAddress);

        const interaction: Interaction = contract.methods.getReservesAndTotalSupply(
            [],
        );

        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);

        const pairInfo = {
            reserves0: response.values[0].valueOf().toString(),
            reserves1: response.values[1].valueOf().toString(),
            totalSupply: response.values[2].valueOf().toString(),
        };
        return pairInfo;
    }

    async getTemporaryFunds(
        pairAddress: string,
        callerAddress: string,
        tokenID: string,
    ): Promise<string> {
        const contract = await this.getContract(pairAddress);

        const interaction: Interaction = contract.methods.getTemporaryFunds([
            BytesValue.fromHex(new Address(callerAddress).hex()),
            BytesValue.fromUTF8(tokenID),
        ]);

        const queryResponse = await contract.runQuery(
            this.proxy,
            interaction.buildQuery(),
        );

        const response = interaction.interpretQueryResponse(queryResponse);

        const temporaryFunds = response.firstValue.valueOf().toString();

        return temporaryFunds;
    }
}
