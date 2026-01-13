import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';
import {
    LockedTokensInfo,
    PairModel,
} from 'src/modules/pair/models/pair.model';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { TokensSyncService } from './tokens.sync.service';

const MIN_TRENDING_SCORE = -(10 ** 9);

@Injectable()
export class PairsSyncService {
    constructor(
        private readonly pairAbi: PairAbiService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairCompute: PairComputeService,
        private readonly contextGetter: ContextGetterService,
        private readonly tokensSyncService: TokensSyncService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async addPair(
        pairMetadata: PairMetadata,
        timestamp?: number,
    ): Promise<{
        pair: PairModel;
        firstToken: EsdtToken;
        secondToken: EsdtToken;
    }> {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();

        const pair = await this.populatePair(
            pairMetadata,
            currentEpoch,
            timestamp,
        );

        const { firstTokenId, secondTokenId } = pair;

        const [firstToken, secondToken] = await Promise.all([
            this.tokensSyncService.populateToken(firstTokenId),
            this.tokensSyncService.populateToken(secondTokenId),
        ]);

        if (firstToken === undefined || secondToken === undefined) {
            throw new Error(
                `Could not get tokens ${firstTokenId}/${secondTokenId} for pair ${pair.address}`,
            );
        }

        pair.firstTokenVolume24h = '0';
        pair.secondTokenVolume24h = '0';
        pair.volumeUSD24h = '0';
        pair.previous24hVolumeUSD = '0';
        pair.feesUSD24h = '0';
        pair.previous24hFeesUSD = '0';
        pair.previous24hLockedValueUSD = '0';
        pair.tradesCount = 0;
        pair.tradesCount24h = 0;
        pair.feesAPR = '0';
        pair.compoundedAprValue = '0';
        pair.hasFarms = false;
        pair.hasDualFarms = false;

        firstToken.volumeUSD24h = '0';
        firstToken.previous24hVolume = '0';
        firstToken.previous24hPrice = '0';
        firstToken.previous7dPrice = '0';
        firstToken.swapCount24h = 0;
        firstToken.previous24hSwapCount = 0;
        firstToken.volumeUSDChange24h = 0;
        firstToken.priceChange24h = 0;
        firstToken.priceChange7d = 0;
        firstToken.tradeChange24h = 0;
        firstToken.trendingScore = new BigNumber(MIN_TRENDING_SCORE)
            .times(3)
            .toFixed();

        secondToken.volumeUSD24h = '0';
        secondToken.previous24hVolume = '0';
        secondToken.previous24hPrice = '0';
        secondToken.previous7dPrice = '0';
        secondToken.swapCount24h = 0;
        secondToken.previous24hSwapCount = 0;
        secondToken.volumeUSDChange24h = 0;
        secondToken.priceChange24h = 0;
        secondToken.priceChange7d = 0;
        secondToken.tradeChange24h = 0;
        secondToken.trendingScore = new BigNumber(MIN_TRENDING_SCORE)
            .times(3)
            .toFixed();

        return {
            pair,
            firstToken,
            secondToken,
        };
    }

    async populatePair(
        pairMetadata: PairMetadata,
        currentEpoch: number,
        timestamp?: number,
    ): Promise<PairModel> {
        const profiler = new PerformanceProfiler();

        const { firstTokenID, secondTokenID, address } = pairMetadata;

        const [
            liquidityPoolTokenId,
            info,
            totalFeePercent,
            specialFeePercent,
            feesCollectorCutPercentage,
            trustedSwapPairs,
            state,
            feeState,
            whitelistedManagedAddresses,
            initialLiquidityAdder,
            feeDestinations,
            feesCollectorAddress,
            lockingScAddress,
            unlockEpoch,
            lockingDeadlineEpoch,
            deployedAt,
        ] = await Promise.all([
            this.pairAbi.getLpTokenIDRaw(address),
            this.pairAbi.getPairInfoMetadataRaw(address),
            this.pairAbi.getTotalFeePercentRaw(address),
            this.pairAbi.getSpecialFeePercentRaw(address),
            this.pairAbi.getFeesCollectorCutPercentageRaw(address),
            this.pairAbi.getTrustedSwapPairsRaw(address),
            this.pairAbi.getStateRaw(address),
            this.pairAbi.getFeeStateRaw(address),
            this.pairAbi.getWhitelistedAddressesRaw(address),
            this.pairAbi.getInitialLiquidityAdderRaw(address),
            this.pairAbi.getFeeDestinationsRaw(address),
            this.pairAbi.getFeesCollectorAddressRaw(address),
            this.pairAbi.getLockingScAddressRaw(address),
            this.pairAbi.getUnlockEpochRaw(address),
            this.pairAbi.getLockingDeadlineEpochRaw(address),
            this.pairCompute.computeDeployedAt(address),
        ]);

        let lockedTokensInfo: LockedTokensInfo;

        if (
            lockingScAddress !== undefined &&
            unlockEpoch !== undefined &&
            lockingDeadlineEpoch !== undefined &&
            currentEpoch < lockingDeadlineEpoch
        ) {
            lockedTokensInfo = new LockedTokensInfo({
                lockingScAddress: lockingScAddress,
                unlockEpoch,
                lockingDeadlineEpoch,
            });
        }

        const pair: Partial<PairModel> = {
            address,
            firstTokenId: firstTokenID,
            secondTokenId: secondTokenID,
            ...(liquidityPoolTokenId && { liquidityPoolTokenId }),
            info,
            totalFeePercent: new BigNumber(totalFeePercent)
                .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
                .toNumber(),
            specialFeePercent: new BigNumber(specialFeePercent)
                .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
                .toNumber(),
            feesCollectorCutPercentage:
                feesCollectorCutPercentage /
                constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS,
            trustedSwapPairs,
            state,
            feeState,
            whitelistedManagedAddresses,
            initialLiquidityAdder,
            feeDestinations,
            feesCollectorAddress,
            lockedTokensInfo,
            deployedAt: deployedAt ?? timestamp ?? 0,
        };

        profiler.stop();

        this.logger.debug(
            `${this.populatePair.name} : ${profiler.duration}ms`,
            {
                context: PairsSyncService.name,
                address,
                tokens: `${firstTokenID}/${secondTokenID}`,
            },
        );

        return pair as PairModel;
    }

    async indexPairLpToken(address: string): Promise<EsdtToken | undefined> {
        const lpTokenId = await this.pairAbi.getLpTokenIDRaw(address);

        if (lpTokenId === undefined) {
            return undefined;
        }

        const lpToken = await this.tokensSyncService.populateToken(
            lpTokenId,
            address,
        );

        if (lpToken == undefined) {
            return undefined;
        }

        lpToken.volumeUSD24h = '0';
        lpToken.previous24hVolume = '0';
        lpToken.previous24hPrice = '0';
        lpToken.previous7dPrice = '0';
        lpToken.swapCount24h = 0;
        lpToken.previous24hSwapCount = 0;
        lpToken.volumeUSDChange24h = 0;
        lpToken.priceChange24h = 0;
        lpToken.priceChange7d = 0;
        lpToken.tradeChange24h = 0;
        lpToken.trendingScore = new BigNumber(MIN_TRENDING_SCORE)
            .times(3)
            .toFixed();

        return lpToken;
    }

    async getPairReservesAndState(
        pair: PairModel,
    ): Promise<Partial<PairModel>> {
        const [info, state] = await Promise.all([
            this.pairAbi.getPairInfoMetadataRaw(pair.address),
            this.pairAbi.getStateRaw(pair.address),
        ]);

        const pairUpdates: Partial<PairModel> = {
            info,
            state,
        };

        return pairUpdates;
    }
}
