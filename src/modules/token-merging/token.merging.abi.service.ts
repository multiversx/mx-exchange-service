import { Address, BytesValue, Interaction } from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { GenericEsdtAmountPair } from 'src/models/proxy.model';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import {
    TokensMergingArgs,
    UserNftDepositArgs,
} from './dto/token.merging.args';

@Injectable()
export class TokenMergingAbiService {
    constructor(private readonly elrondProxy: ElrondProxyService) {}

    async getNftDeposit(
        args: UserNftDepositArgs,
    ): Promise<GenericEsdtAmountPair[]> {
        const contract = await this.elrondProxy.getSmartContractByType(
            args.smartContractType,
            args.address,
        );
        const interaction: Interaction = contract.methods.getnftDeposit([
            BytesValue.fromHex(new Address(args.userAddress).hex()),
        ]);
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);
        return response.firstValue.valueOf().map(value => {
            const depositedNft = value.valueOf();
            const genericEsdtAmountPair = new GenericEsdtAmountPair();
            genericEsdtAmountPair.tokenID = depositedNft.token_id.toString();
            genericEsdtAmountPair.tokenNonce = depositedNft.token_nonce.toNumber();
            genericEsdtAmountPair.amount = depositedNft.amount.toFixed();
            return genericEsdtAmountPair;
        });
    }

    async getnftDepositMaxLen(args: TokensMergingArgs): Promise<BigNumber> {
        const contract = await this.elrondProxy.getSmartContractByType(
            args.smartContractType,
            args.address,
        );
        const interaction: Interaction = contract.methods.getnftDepositMaxLen(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);

        return response.firstValue.valueOf();
    }

    async getNftDepositAcceptedTokenIds(
        args: TokensMergingArgs,
    ): Promise<string[]> {
        const contract = await this.elrondProxy.getSmartContractByType(
            args.smartContractType,
            args.address,
        );
        const interaction: Interaction = contract.methods.getNftDepositAcceptedTokenIds(
            [],
        );
        const queryResponse = await contract.runQuery(
            this.elrondProxy.getService(),
            interaction.buildQuery(),
        );
        const response = interaction.interpretQueryResponse(queryResponse);

        return response.firstValue.valueOf().map(value => value);
    }
}
