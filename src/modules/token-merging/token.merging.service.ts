import { Injectable } from '@nestjs/common';
import { GenericEsdtAmountPair } from 'src/models/proxy.model';
import {
    TokensMergingArgs,
    UserNftDepositArgs,
} from './dto/token.merging.args';
import { TokenMergingAbiService } from './token.merging.abi.service';

@Injectable()
export class TokenMergingService {
    constructor(private readonly mergeTokensAbi: TokenMergingAbiService) {}

    async getNftDeposit(
        args: UserNftDepositArgs,
    ): Promise<GenericEsdtAmountPair[]> {
        const depositedNfts = await this.mergeTokensAbi.getNftDeposit(args);
        return depositedNfts;
    }

    async getNftDepositMaxLen(args: TokensMergingArgs): Promise<number> {
        return this.mergeTokensAbi.getnftDepositMaxLen(args);
    }

    async getNftDepositAcceptedTokenIDs(
        args: TokensMergingArgs,
    ): Promise<string[]> {
        return this.mergeTokensAbi.getNftDepositAcceptedTokenIds(args);
    }
}
