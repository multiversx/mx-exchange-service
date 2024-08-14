import { Injectable, Scope } from '@nestjs/common';
import { FarmComputeService } from './farm.compute.service';
import DataLoader from 'dataloader';

@Injectable({
    scope: Scope.REQUEST,
})
export class FarmComputeLoader {
    constructor(protected readonly farmCompute: FarmComputeService) {}

    public readonly farmLockedValueUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await this.farmCompute.getAllKeys(
                addresses,
                'farm.farmLockedValueUSD',
                this.farmCompute.farmLockedValueUSD.bind(this.farmCompute),
            );
        },
    );

    public readonly farmedTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await this.farmCompute.getAllKeys(
                addresses,
                'farm.farmedTokenPriceUSD',
                this.farmCompute.farmedTokenPriceUSD.bind(this.farmCompute),
            );
        },
    );

    public readonly farmTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await this.farmCompute.getAllKeys(
                addresses,
                'farm.farmTokenPriceUSD',
                this.farmCompute.farmTokenPriceUSD.bind(this.farmCompute),
            );
        },
    );

    public readonly farmingTokenPriceUSDLoader = new DataLoader<string, string>(
        async (addresses: string[]) => {
            return await this.farmCompute.getAllKeys(
                addresses,
                'farm.farmingTokenPriceUSD',
                this.farmCompute.farmingTokenPriceUSD.bind(this.farmCompute),
            );
        },
    );
}
