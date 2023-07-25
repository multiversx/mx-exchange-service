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
    tokenReserve(): Promise<string> {
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
    async totalFeePercent(pairAddress: string): Promise<number> {
        return PairsData(pairAddress).totalFeePercent;
    }
    specialFeePercent(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    async trustedSwapPairs(): Promise<string[]> {
        return [];
    }
    async initialLiquidityAdder(): Promise<string> {
        return Address.Zero().bech32();
    }
    async state(pairAddress: string): Promise<string> {
        return PairsData(pairAddress).state;
    }
    feeState(): Promise<boolean> {
        throw new Error('Method not implemented.');
    }
    async lockingScAddress(): Promise<string> {
        return Address.Zero().bech32();
    }
    async unlockEpoch(): Promise<number> {
        return 1;
    }
    async lockingDeadlineEpoch(): Promise<number> {
        return 1;
    }
    feeDestinations(): Promise<FeeDestination[]> {
        throw new Error('Method not implemented.');
    }
    whitelistedAddresses(): Promise<string[]> {
        throw new Error('Method not implemented.');
    }
    routerAddress(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    routerOwnerAddress(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    externSwapGasLimit(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    transferExecGasLimit(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    safePrice(): Promise<EsdtTokenPayment> {
        throw new Error('Method not implemented.');
    }
    numSwapsByAddress(): Promise<number> {
        throw new Error('Method not implemented.');
    }
    numAddsByAddress(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    async getTemporaryFunds(): Promise<BigNumber> {
        return new BigNumber(100);
    }
}

export const PairAbiServiceProvider = {
    provide: PairAbiService,
    useClass: PairAbiServiceMock,
};
