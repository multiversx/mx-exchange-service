import { Injectable } from '@nestjs/common';
import { cacheConfig } from '../../config';
import { CacheManagerService } from './cache-manager.service';

const Keys = {
    firstTokenID: (pairAddress: string) => `${pairAddress}.firstTokenID`,
    secondTokenID: (pairAddress: string) => `${pairAddress}.secondTokenID`,
    lpTokenID: (pairAddress: string) => `${pairAddress}.lpTokenID`,
    reserves: (pairAddress: string, tokenID: string) =>
        `${pairAddress}.${tokenID}.reserves`,
    totalSupply: (pairAddress: string) => `${pairAddress}.totalSupply`,
    temporaryFunds: (pairAddress: string, caller: string, tokenID: string) =>
        `${pairAddress}.temporaryFunds.${caller}.${tokenID}`,
};

@Injectable()
export class CachePairService {
    constructor(private cacheManagerService: CacheManagerService) {}

    async getFirstTokenID(pairAddress: string): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.firstTokenID(pairAddress));
    }

    async setFirstTokenID(
        pairAddress: string,
        firstTokenID: Record<string, any>,
    ): Promise<void> {
        return this.cacheManagerService.set(
            Keys.firstTokenID(pairAddress),
            firstTokenID,
            cacheConfig.token,
        );
    }

    async getSecondTokenID(pairAddress: string): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.secondTokenID(pairAddress));
    }

    async setSecondTokenID(
        pairAddress: string,
        secondTokenID: Record<string, any>,
    ): Promise<void> {
        return this.cacheManagerService.set(
            Keys.secondTokenID(pairAddress),
            secondTokenID,
            cacheConfig.token,
        );
    }

    async getLpTokenID(pairAddress: string): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.lpTokenID(pairAddress));
    }

    async setLpTokenID(
        pairAddress: string,
        tokenID: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.lpTokenID(pairAddress),
            tokenID,
            cacheConfig.token,
        );
    }

    async getReserves(
        pairAddress: string,
        tokenID: string,
    ): Promise<Record<string, any>> {
        return this.cacheManagerService.get(
            Keys.reserves(pairAddress, tokenID),
        );
    }

    async setReserves(
        pairAddress: string,
        tokenID: string,
        reserves: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.reserves(pairAddress, tokenID),
            reserves,
            cacheConfig.default,
        );
    }

    async getTotalSupply(pairAddress: string): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.totalSupply(pairAddress));
    }

    async setTotalSupply(
        pairAddress: string,
        totalSupply: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.totalSupply(pairAddress),
            totalSupply,
            cacheConfig.default,
        );
    }

    async getTemporaryFunds(
        pairAddress: string,
        caller: string,
        tokenID: string,
    ): Promise<Record<string, any>> {
        return this.cacheManagerService.get(
            Keys.temporaryFunds(pairAddress, caller, tokenID),
        );
    }

    async setTemporaryFunds(
        pairAddress: string,
        caller: string,
        tokenID: string,
        temporaryFunds: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.temporaryFunds(pairAddress, caller, tokenID),
            temporaryFunds,
            cacheConfig.default,
        );
    }
}
