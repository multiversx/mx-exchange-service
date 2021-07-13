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
        const nftDepositMaxLen = await this.mergeTokensAbi.getnftDepositMaxLen(
            args,
        );
        return nftDepositMaxLen.toNumber();
    }

    async getNftDepositAcceptedTokenIDs(
        args: TokensMergingArgs,
    ): Promise<string[]> {
        const nftDepositAcceptedTokenIDs = await this.mergeTokensAbi.getNftDepositAcceptedTokenIds(
            args,
        );
        return nftDepositAcceptedTokenIDs.map(tokenID => tokenID.toString());
    }
}
