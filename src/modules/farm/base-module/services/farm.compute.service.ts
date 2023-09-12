import BigNumber from 'bignumber.js';
import { constantsConfig, scAddress } from 'src/config';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { CalculateRewardsArgs } from '../../models/farm.args';
import { FarmAbiService } from './farm.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { FarmServiceBase } from './farm.base.service';
import { Inject, forwardRef } from '@nestjs/common';
import { IFarmComputeService } from './interfaces';

export abstract class FarmComputeService implements IFarmComputeService {
    constructor(
        protected readonly farmAbi: FarmAbiService,
        @Inject(forwardRef(() => FarmServiceBase))
        protected readonly farmService: FarmServiceBase,
        protected readonly pairService: PairService,
        protected readonly pairCompute: PairComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly tokenCompute: TokenComputeService,
    ) {}

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async farmLockedValueUSD(farmAddress: string): Promise<string> {
        return await this.computeFarmLockedValueUSD(farmAddress);
    }

    async computeFarmLockedValueUSD(farmAddress: string): Promise<string> {
        return '0';
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async farmedTokenPriceUSD(farmAddress: string): Promise<string> {
        return await this.computeFarmedTokenPriceUSD(farmAddress);
    }

    async computeFarmedTokenPriceUSD(farmAddress: string): Promise<string> {
        const farmedTokenID = await this.farmAbi.farmedTokenID(farmAddress);
        if (scAddress.has(farmedTokenID)) {
            const tokenPriceUSD =
                await this.tokenCompute.computeTokenPriceDerivedUSD(
                    farmedTokenID,
                );
            return tokenPriceUSD;
        }

        return await this.tokenCompute.computeTokenPriceDerivedUSD(
            farmedTokenID,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async farmTokenPriceUSD(farmAddress: string): Promise<string> {
        return this.farmingTokenPriceUSD(farmAddress);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'farm',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async farmingTokenPriceUSD(farmAddress: string): Promise<string> {
        return await this.computeFarmingTokenPriceUSD(farmAddress);
    }

    async computeFarmingTokenPriceUSD(farmAddress: string): Promise<string> {
        const farmingTokenID = await this.farmAbi.farmingTokenID(farmAddress);
        if (scAddress.has(farmingTokenID)) {
            return await this.tokenCompute.computeTokenPriceDerivedUSD(
                farmingTokenID,
            );
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );
        return this.pairCompute.computeLpTokenPriceUSD(pairAddress);
    }

    async computeFarmRewardsForPosition(
        positon: CalculateRewardsArgs,
        rewardPerShare: string,
    ): Promise<BigNumber> {
        const [
            currentNonce,
            lastRewardBlockNonce,
            perBlockRewardAmount,
            divisionSafetyConstant,
            farmTokenSupply,
            farmRewardPerShare,
            produceRewardsEnabled,
        ] = await Promise.all([
            this.contextGetter.getShardCurrentBlockNonce(1),
            this.farmAbi.lastRewardBlockNonce(positon.farmAddress),
            this.farmAbi.rewardsPerBlock(positon.farmAddress),
            this.farmAbi.divisionSafetyConstant(positon.farmAddress),
            this.farmAbi.farmTokenSupply(positon.farmAddress),
            this.farmAbi.rewardPerShare(positon.farmAddress),
            this.farmAbi.produceRewardsEnabled(positon.farmAddress),
        ]);

        const amountBig = new BigNumber(positon.liquidity);
        const currentBlockBig = new BigNumber(currentNonce);
        const lastRewardBlockNonceBig = new BigNumber(lastRewardBlockNonce);
        const perBlockRewardAmountBig = new BigNumber(perBlockRewardAmount);
        const divisionSafetyConstantBig = new BigNumber(divisionSafetyConstant);
        const farmTokenSupplyBig = new BigNumber(farmTokenSupply);
        const farmRewardPerShareBig = new BigNumber(farmRewardPerShare);
        const rewardPerShareBig = new BigNumber(rewardPerShare);

        let toBeMinted = new BigNumber(0);

        if (currentNonce > lastRewardBlockNonce && produceRewardsEnabled) {
            toBeMinted = perBlockRewardAmountBig.times(
                currentBlockBig.minus(lastRewardBlockNonceBig),
            );
        }
        const rewardIncrease = toBeMinted;
        const rewardPerShareIncrease = rewardIncrease
            .times(divisionSafetyConstantBig)
            .dividedBy(farmTokenSupplyBig);
        const futureRewardPerShare = farmRewardPerShareBig.plus(
            rewardPerShareIncrease,
        );

        if (futureRewardPerShare.isGreaterThan(rewardPerShare)) {
            const rewardPerShareDiff =
                futureRewardPerShare.minus(rewardPerShareBig);

            return amountBig
                .times(rewardPerShareDiff)
                .dividedBy(divisionSafetyConstantBig);
        }
        return new BigNumber(0);
    }

    async computeAnualRewardsUSD(farmAddress: string): Promise<string> {
        const farmedToken = await this.farmService.getFarmedToken(farmAddress);

        const [farmedTokenPriceUSD, rewardsPerBlock] = await Promise.all([
            this.tokenCompute.computeTokenPriceDerivedUSD(
                farmedToken.identifier,
            ),
            this.farmAbi.rewardsPerBlock(farmAddress),
        ]);

        const totalRewardsPerYear = new BigNumber(rewardsPerBlock).multipliedBy(
            constantsConfig.BLOCKS_IN_YEAR,
        );

        return computeValueUSD(
            totalRewardsPerYear.toFixed(),
            farmedToken.decimals,
            farmedTokenPriceUSD,
        ).toFixed();
    }
}
