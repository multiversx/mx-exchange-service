import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { scAddress, tokenProviderUSD } from 'src/config';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';

@Injectable()
export class MexService {
    constructor(
        private readonly energyAbi: EnergyAbiService,
        private readonly pairCompute: PairComputeService,
        private readonly routerAbi: RouterAbiService,
    ) {}

    async getPrice(): Promise<BigNumber> {
        const [mexTokenID, pairsMetadata, egldPriceInUSD] = await Promise.all([
            this.energyAbi.baseAssetTokenID(),
            this.routerAbi.pairsMetadata(),
            this.pairCompute.firstTokenPrice(scAddress.WEGLD_USDC),
        ]);

        const mexEgldPair = pairsMetadata.find((metadata) => {
            return (
                (metadata.firstTokenID === mexTokenID &&
                    metadata.secondTokenID === tokenProviderUSD) ||
                (metadata.firstTokenID === tokenProviderUSD &&
                    metadata.secondTokenID === mexTokenID)
            );
        });

        if (!mexEgldPair) {
            throw new Error('MEX/WEGLD pair not found');
        }

        const mexPriceInEGLD =
            mexEgldPair.firstTokenID === mexTokenID
                ? await this.pairCompute.firstTokenPrice(mexEgldPair.address)
                : await this.pairCompute.secondTokenPrice(mexEgldPair.address);

        return new BigNumber(mexPriceInEGLD).times(egldPriceInUSD);
    }
}
