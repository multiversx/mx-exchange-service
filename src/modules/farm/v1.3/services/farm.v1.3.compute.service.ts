import { Inject, Injectable, forwardRef } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { scAddress } from 'src/config';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { FarmComputeService } from '../../base-module/services/farm.compute.service';
import { FarmAbiServiceV1_3 } from './farm.v1.3.abi.service';
import { FarmServiceV1_3 } from './farm.v1.3.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { IFarmComputeServiceV1_3 } from './interfaces';
import { CacheService } from 'src/services/caching/cache.service';

@Injectable()
export class FarmComputeServiceV1_3
    extends FarmComputeService
    implements IFarmComputeServiceV1_3
{
    constructor(
        protected readonly farmAbi: FarmAbiServiceV1_3,
        @Inject(forwardRef(() => FarmServiceV1_3))
        protected readonly farmService: FarmServiceV1_3,
        protected readonly pairService: PairService,
        protected readonly pairCompute: PairComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly tokenCompute: TokenComputeService,
        protected readonly cacheService: CacheService,
    ) {
        super(
            farmAbi,
            farmService,
            pairService,
            pairCompute,
            contextGetter,
            tokenCompute,
            cacheService,
        );
    }

    async computeFarmLockedValueUSD(farmAddress: string): Promise<string> {
        const [farmingToken, farmTokenSupply] = await Promise.all([
            this.farmService.getFarmingToken(farmAddress),
            this.farmAbi.farmTokenSupply(farmAddress),
        ]);

        if (scAddress.has(farmingToken.identifier)) {
            const tokenPriceUSD = await this.pairCompute.tokenPriceUSD(
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

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: Constants.oneMinute(),
    })
    async farmAPR(farmAddress: string): Promise<string> {
        return this.computeFarmAPR(farmAddress);
    }

    async computeFarmAPR(farmAddress: string): Promise<string> {
        const [
            farmedTokenID,
            farmingTokenID,
            totalRewardsPerYearUSD,
            farmTokenSupplyUSD,
        ] = await Promise.all([
            this.farmAbi.farmedTokenID(farmAddress),
            this.farmAbi.farmingTokenID(farmAddress),
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
                ? new BigNumber(await this.pairCompute.feesAPR(pairAddress))
                : new BigNumber(0);
        }
        return feesAPR.isNaN() ? apr.toFixed() : apr.plus(feesAPR).toFixed();
    }
}
