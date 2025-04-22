import BigNumber from 'bignumber.js';
import { IPairAbiService } from '../interfaces';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { PairInfoModel } from '../models/pair-info.model';
import { FeeDestination } from '../models/pair.model';
import { PairsData } from './pair.constants';
import { Address } from '@multiversx/sdk-core/out';
import { PairAbiService } from '../services/pair.abi.service';

export class PairAbiServiceMock implements IPairAbiService {
    async firstTokenID(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).firstToken.identifier;
    }
    async secondTokenID(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).secondToken.identifier;
    }
    async lpTokenID(pairAddress: string): Promise<string> {
        return PairsData(pairAddress)?.liquidityPoolToken.identifier;
    }
    tokenReserve(pairAddress: string, tokenID: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async firstTokenReserve(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).info.reserves0;
    }
    async secondTokenReserve(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).info.reserves1;
    }
    async totalSupply(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).info.totalSupply;
    }
    async pairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        return PairsData(pairAddress).info;
    }
    async getAllPairsInfoMetadata(
        pairAddresses: string[],
    ): Promise<PairInfoModel[]> {
        return pairAddresses.map((pairAddress) => PairsData(pairAddress).info);
    }
    async totalFeePercent(pairAddress: string): Promise<number> {
        return PairsData(pairAddress).totalFeePercent;
    }
    async getAllPairsTotalFeePercent(
        pairAddresses: string[],
    ): Promise<number[]> {
        return pairAddresses.map(
            (pairAddress) => PairsData(pairAddress).totalFeePercent,
        );
    }
    specialFeePercent(pairAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    async trustedSwapPairs(pairAddress: string): Promise<string[]> {
        return [];
    }
    async initialLiquidityAdder(pairAddress: string): Promise<string> {
        return Address.newFromHex(
            '0000000000000000000000000000000000000000000000000000000000000001',
        ).toBech32();
    }
    async state(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).state;
    }
    async feeState(pairAddress: string): Promise<boolean> {
        return PairsData(pairAddress).feeState;
    }
    async lockingScAddress(pairAddress: string): Promise<string> {
        return Address.Zero().bech32();
    }
    async unlockEpoch(pairAddress: string): Promise<number> {
        return 1;
    }
    async lockingDeadlineEpoch(pairAddress: string): Promise<number> {
        return 1;
    }
    feeDestinations(pairAddress: string): Promise<FeeDestination[]> {
        throw new Error('Method not implemented.');
    }
    whitelistedAddresses(pairAddress: string): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
    routerAddress(pairAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    routerOwnerAddress(pairAddress: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    externSwapGasLimit(pairAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    transferExecGasLimit(pairAddress: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    safePrice(
        pairAddress: string,
        esdtTokenPayment: EsdtTokenPayment,
    ): Promise<EsdtTokenPayment> {
        throw new Error('Method not implemented.');
    }
    numSwapsByAddress(pairAddress: string, address: string): Promise<number> {
        throw new Error('Method not implemented.');
    }
    numAddsByAddress(pairAddress: string, address: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async getTemporaryFunds(
        pairAddress: string,
        callerAddress: string,
        tokenID: string,
    ): Promise<BigNumber> {
        return new BigNumber(100);
    }
}

export const PairAbiServiceProvider = {
    provide: PairAbiService,
    useClass: PairAbiServiceMock,
};
