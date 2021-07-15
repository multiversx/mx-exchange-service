import { Injectable } from '@nestjs/common';
import { farmsConfig, scAddress } from 'src/config';
import { GenericEsdtAmountPair } from 'src/models/proxy.model';
import {
    SmartContractType,
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
        const userNftDeposits = [];
        for (const farmAddress of farmsConfig) {
            const depositedNfts = await this.mergeTokensAbi.getNftDeposit(
                args.userAddress,
                SmartContractType.FARM,
                farmAddress,
            );
            console.log(depositedNfts);
            for (const depositedNft of depositedNfts) {
                depositedNft.address = farmAddress;
                userNftDeposits.push(depositedNft);
            }
        }
        return userNftDeposits;
    }

    async getNftDepositProxy(
        args: UserNftDepositArgs,
    ): Promise<GenericEsdtAmountPair[]> {
        const userNftDeposits = [];

        const depositedNfts = await this.mergeTokensAbi.getNftDeposit(
            args.userAddress,
            SmartContractType.PROXY_FARM,
        );
        for (const depositedNft of depositedNfts) {
            depositedNft.address = scAddress.proxyDexAddress;
            userNftDeposits.push(depositedNft);
        }

        return userNftDeposits;
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
