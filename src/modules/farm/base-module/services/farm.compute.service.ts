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
import { CacheService } from 'src/services/caching/cache.service';

export abstract class FarmComputeService implements IFarmComputeService {
    constructor(
        protected readonly farmAbi: FarmAbiService,
        @Inject(forwardRef(() => FarmServiceBase))
        protected readonly farmService: FarmServiceBase,
        protected readonly pairService: PairService,
        protected readonly pairCompute: PairComputeService,
        protected readonly contextGetter: ContextGetterService,
        protected readonly tokenCompute: TokenComputeService,
        protected readonly cacheService: CacheService,
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
        return this.computeFarmLockedValueUSD(farmAddress);
    }

    async computeFarmLockedValueUSD(farmAddress: string): Promise<string> {
        return '0';
    }

    async farmedTokenPriceUSD(farmAddress: string): Promise<string> {
        const farmedTokenID = await this.farmAbi.farmedTokenID(farmAddress);
        return this.tokenCompute.tokenPriceDerivedUSD(farmedTokenID);
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
        return this.computeFarmingTokenPriceUSD(farmAddress);
    }

    async computeFarmingTokenPriceUSD(farmAddress: string): Promise<string> {
        const farmingTokenID = await this.farmAbi.farmingTokenID(farmAddress);
        if (scAddress.has(farmingTokenID)) {
            return this.tokenCompute.tokenPriceDerivedUSD(farmingTokenID);
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );
        return this.pairCompute.computeLpTokenPriceUSD(pairAddress);
    }

    async computeMintedRewards(farmAddress: string): Promise<BigNumber> {
        const shardID = await this.farmAbi.farmShard(farmAddress);
        const [
            currentNonce,
            lastRewardBlockNonce,
            perBlockRewardAmount,
            produceRewardsEnabled,
        ] = await Promise.all([
            this.contextGetter.getShardCurrentBlockNonce(shardID),
            this.farmAbi.lastRewardBlockNonce(farmAddress),
            this.farmAbi.rewardsPerBlock(farmAddress),
            this.farmAbi.produceRewardsEnabled(farmAddress),
        ]);

        const currentBlockBig = new BigNumber(currentNonce);
        const lastRewardBlockNonceBig = new BigNumber(lastRewardBlockNonce);
        const perBlockRewardAmountBig = new BigNumber(perBlockRewardAmount);

        let toBeMinted = new BigNumber(0);

        if (currentNonce > lastRewardBlockNonce && produceRewardsEnabled) {
            toBeMinted = perBlockRewardAmountBig.times(
                currentBlockBig.minus(lastRewardBlockNonceBig),
            );
        }

        return toBeMinted;
    }

    async computeFarmRewardsForPosition(
        positon: CalculateRewardsArgs,
        rewardPerShare: string,
    ): Promise<BigNumber> {
        const [
            rewardIncrease,
            divisionSafetyConstant,
            farmTokenSupply,
            farmRewardPerShare,
        ] = await Promise.all([
            this.computeMintedRewards(positon.farmAddress),
            this.farmAbi.divisionSafetyConstant(positon.farmAddress),
            this.farmAbi.farmTokenSupply(positon.farmAddress),
            this.farmAbi.rewardPerShare(positon.farmAddress),
        ]);

        const amountBig = new BigNumber(positon.liquidity);
        const divisionSafetyConstantBig = new BigNumber(divisionSafetyConstant);
        const farmTokenSupplyBig = new BigNumber(farmTokenSupply);
        const farmRewardPerShareBig = new BigNumber(farmRewardPerShare);
        const rewardPerShareBig = new BigNumber(rewardPerShare);

        const rewardPerShareIncrease = rewardIncrease
            .times(divisionSafetyConstantBig)
            .dividedBy(farmTokenSupplyBig)
            .integerValue();
        const futureRewardPerShare = farmRewardPerShareBig.plus(
            rewardPerShareIncrease,
        );

        if (futureRewardPerShare.isGreaterThan(rewardPerShare)) {
            const rewardPerShareDiff =
                futureRewardPerShare.minus(rewardPerShareBig);

            return amountBig
                .times(rewardPerShareDiff)
                .dividedBy(divisionSafetyConstantBig)
                .integerValue();
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
