import { Address, BytesValue, Interaction } from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import { GenericEsdtAmountPair } from 'src/models/proxy.model';
import { ElrondProxyService } from '../../services/elrond-communication/elrond-proxy.service';
import { BaseNftDepositArgs, NftDepositArgs } from './dto/token.merging.args';

@Injectable()
export class TokenMergingAbiService {
    constructor(private readonly elrondProxy: ElrondProxyService) {}

    async getNftDeposit(
        args: NftDepositArgs,
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

        return response.firstValue.valueOf().map(value => value);
    }

    async getnftDepositMaxLen(args: BaseNftDepositArgs): Promise<number> {
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
        args: BaseNftDepositArgs,
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
