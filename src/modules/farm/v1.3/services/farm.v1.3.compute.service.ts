import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { FarmComputeService } from '../../base-module/services/farm.compute.service';
import { FarmV13GetterService } from './farm.v1.3.getter.service';

@Injectable()
export class FarmV13ComputeService extends FarmComputeService {
    constructor(
        @Inject(forwardRef(() => FarmV13GetterService))
        protected readonly farmGetter: FarmV13GetterService,
        protected readonly pairService: PairService,
        protected readonly pairGetter: PairGetterService,
        protected readonly pairCompute: PairComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly tokenCompute: TokenComputeService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(
            farmGetter,
            pairService,
            pairGetter,
            pairCompute,
            contextGetter,
            tokenCompute,
            logger,
        );
    }

    async computeFarmLockedValueUSD(farmAddress: string): Promise<string> {
        const [farmingToken, farmTokenSupply] = await Promise.all([
            this.farmGetter.getFarmingToken(farmAddress),
            this.farmGetter.getFarmTokenSupply(farmAddress),
        ]);

        if (scAddress.has(farmingToken.identifier)) {
            const tokenPriceUSD = await this.pairGetter.getTokenPriceUSD(
                farmingToken.identifier,
            );
            return computeValueUSD(
                farmTokenSupply,
                farmingToken.decimals,
                tokenPriceUSD,
            ).toFixed();
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingToken.identifier,
        );
        const lockedValuesUSD = await this.pairService.getLiquidityPositionUSD(
            pairAddress,
            farmTokenSupply,
        );
        return lockedValuesUSD;
    }

    async computeFarmAPR(farmAddress: string): Promise<string> {
        const [
            farmedTokenID,
            farmingTokenID,
            totalRewardsPerYearUSD,
            farmTokenSupplyUSD,
        ] = await Promise.all([
            this.farmGetter.getFarmedTokenID(farmAddress),
            this.farmGetter.getFarmingTokenID(farmAddress),
            this.computeAnualRewardsUSD(farmAddress),
            this.computeFarmLockedValueUSD(farmAddress),
        ]);

        const apr = new BigNumber(totalRewardsPerYearUSD).div(
            farmTokenSupplyUSD,
        );

        let feesAPR: BigNumber = new BigNumber(0);
        if (farmedTokenID !== farmingTokenID) {
            const pairAddress =
                await this.pairService.getPairAddressByLpTokenID(
                    farmingTokenID,
                );

            feesAPR = pairAddress
                ? new BigNumber(await this.pairGetter.getFeesAPR(pairAddress))
                : new BigNumber(0);
        }
        return feesAPR.isNaN() ? apr.toFixed() : apr.plus(feesAPR).toFixed();
    }
}
