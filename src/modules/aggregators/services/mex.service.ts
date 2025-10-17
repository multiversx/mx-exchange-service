import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';

@Injectable()
export class MexService {
    constructor(
        private readonly energyAbi: EnergyAbiService,
        private readonly tokenCompute: TokenComputeService,
    ) {}

    async getPrice(): Promise<BigNumber> {
        const tokenID = await this.energyAbi.baseAssetTokenID();
        const price = await this.tokenCompute.tokenPriceDerivedUSD(tokenID);

        return new BigNumber(price);
    }
}
