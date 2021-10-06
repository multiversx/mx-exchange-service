import { Injectable } from '@nestjs/common';
import { farmsConfig, scAddress } from 'src/config';
import {
    GenericEsdtAmountPair,
    LockedTokenType,
} from 'src/modules/proxy/models/proxy.model';
import { ProxyFarmService } from '../proxy/proxy-farm/proxy-farm.service';
import { ProxyPairService } from '../proxy/proxy-pair/proxy-pair.service';
import { SmartContractType, TokensMergingArgs } from './dto/token.merging.args';
import { TokenMergingAbiService } from './token.merging.abi.service';

@Injectable()
export class TokenMergingService {
    constructor(
        private readonly mergeTokensAbi: TokenMergingAbiService,
        private readonly proxyPairService: ProxyPairService,
        private readonly proxyFarmService: ProxyFarmService,
    ) {}

    async getNftDeposit(userAddress: string): Promise<GenericEsdtAmountPair[]> {
        const userNftDeposits = [];
        for (const farmAddress of farmsConfig) {
            const depositedNfts = await this.mergeTokensAbi.getNftDeposit(
                userAddress,
                SmartContractType.FARM,
                farmAddress,
            );
            for (const depositedNft of depositedNfts) {
                depositedNft.address = farmAddress;
                userNftDeposits.push(depositedNft);
            }
        }
        return userNftDeposits;
    }

    async getNftDepositProxy(
        userAddress: string,
    ): Promise<GenericEsdtAmountPair[]> {
        const userNftDeposits = [];

        const [
            lockedLpTokenCollection,
            lockedFarmTokenCollection,
            depositedNfts,
        ] = await Promise.all([
            this.proxyPairService.getwrappedLpTokenID(),
            this.proxyFarmService.getwrappedFarmTokenID(),
            this.mergeTokensAbi.getNftDeposit(
                userAddress,
                SmartContractType.PROXY_FARM,
            ),
        ]);
        for (const depositedNft of depositedNfts) {
            depositedNft.address = scAddress.proxyDexAddress;
            switch (depositedNft.tokenID) {
                case lockedLpTokenCollection:
                    depositedNft.type = LockedTokenType.LOCKED_LP_TOKEN;
                    break;
                case lockedFarmTokenCollection:
                    depositedNft.type = LockedTokenType.LOCKED_FARM_TOKEN;
                    break;
            }
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
