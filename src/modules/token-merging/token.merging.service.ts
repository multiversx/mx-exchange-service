import { SmartContract } from '@elrondnetwork/erdjs/out';
import { Injectable } from '@nestjs/common';
import { GenericEsdtAmountPair } from 'src/models/proxy.model';
import { ElrondProxyService } from 'src/services/elrond-communication/elrond-proxy.service';
import { BaseNftDepositArgs, NftDepositArgs } from './dto/token.merging.args';
import { TokenMergingAbiService } from './token.merging.abi.service';

@Injectable()
export class TokenMergingService {
    constructor(
        private readonly elrondProxy: ElrondProxyService,
        private readonly mergeTokensAbi: TokenMergingAbiService,
    ) {}

    async getNftDeposit(
        args: NftDepositArgs,
    ): Promise<GenericEsdtAmountPair[]> {
        const depositedNfts = await this.mergeTokensAbi.getNftDeposit(args);
        return depositedNfts;
    }

    async getNftDepositMaxLen(args: BaseNftDepositArgs): Promise<number> {
        return this.mergeTokensAbi.getnftDepositMaxLen(args);
    }

    async getNftDepositAcceptedTokenIDs(
        args: BaseNftDepositArgs,
    ): Promise<string[]> {
        return this.mergeTokensAbi.getNftDepositAcceptedTokenIds(args);
    }
}
