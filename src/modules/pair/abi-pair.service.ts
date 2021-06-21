import { Injectable } from '@nestjs/common';
import { BytesValue } from '@elrondnetwork/erdjs/out/smartcontracts/typesystem/bytes';
import { Interaction } from '@elrondnetwork/erdjs/out/smartcontracts/interaction';
import { Address } from '@elrondnetwork/erdjs';
import { PairInfoModel } from '../../models/pair-info.model';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import BigNumber from 'bignumber.js';

@Injectable()
export class AbiPairService {
    constructor(private readonly elrondProxy: ElrondProxyService) {}

    async getFirstTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getFirstTokenId([]);
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const firstTokenID = response.firstValue.valueOf().toString();

        return firstTokenID;
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getSecondTokenId([]);
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const secondTokenID = response.firstValue.valueOf().toString();

        return secondTokenID;
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const getLpTokenInteraction: Interaction = contract.methods.getLpTokenIdentifier(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            getLpTokenInteraction.buildQuery(),
        );
        const response = getLpTokenInteraction.interpretQueryResponse(
            queryResponse,
        );

        const lpTokenID = response.firstValue.valueOf().toString();

        return lpTokenID;
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );

        const interaction: Interaction = contract.methods.getReservesAndTotalSupply(
            [],
        );

        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);

        const pairInfo = {
            reserves0: response.values[0].valueOf().toFixed(),
            reserves1: response.values[1].valueOf().toFixed(),
            totalSupply: response.values[2].valueOf().toFixed(),
        };
        return pairInfo;
    }

    async getTemporaryFunds(
        pairAddress: string,
        callerAddress: string,
        tokenID: string,
    ): Promise<BigNumber> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );

        const interaction: Interaction = contract.methods.getTemporaryFunds([
            BytesValue.fromHex(new Address(callerAddress).hex()),
            BytesValue.fromUTF8(tokenID),
        ]);

        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );

        const response = interaction.interpretQueryResponse(queryResponse);

        const temporaryFunds = response.firstValue.valueOf();

        return temporaryFunds;
    }

    async getState(pairAddress: string): Promise<string> {
        const contract = await this.elrondProxy.getPairSmartContract(
            pairAddress,
        );
        const interaction: Interaction = contract.methods.getState([]);
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        const state = response.firstValue.valueOf();
        return state;
    }
}
