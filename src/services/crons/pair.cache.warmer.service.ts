import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { PairSetterService } from 'src/modules/pair/services/pair.setter.service';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';
import { TokenSetterService } from 'src/modules/tokens/services/token.setter.service';
import { AWSTimestreamQueryService } from '../aws/aws.timestream.query';
import { awsConfig } from 'src/config';
import { ElrondDataReadService } from '../elrond-communication/elrond-data.read.service';

@Injectable()
export class PairCacheWarmerService {
    constructor(
        private readonly pairSetterService: PairSetterService,
        private readonly pairComputeService: PairComputeService,
        private readonly abiPairService: PairAbiService,
        private readonly routerGetter: RouterGetterService,
        private readonly apiService: ElrondApiService,
        private readonly tokenSetter: TokenSetterService,
        private readonly awsQuery: AWSTimestreamQueryService,
        private readonly elrondDataReadService: ElrondDataReadService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_30_MINUTES)
    async cachePairs(): Promise<void> {
        const pairsMetadata = await this.routerGetter.getPairsMetadata();
        for (const pairMetadata of pairsMetadata) {
            const lpTokenID = await this.abiPairService.getLpTokenID(
                pairMetadata.address,
            );

            const [
                firstToken,
                secondToken,
                totalFeePercent,
                specialFeePercent,
            ] = await Promise.all([
                this.apiService.getToken(pairMetadata.firstTokenID),
                this.apiService.getToken(pairMetadata.secondTokenID),
                this.abiPairService.getTotalFeePercent(pairMetadata.address),
                this.abiPairService.getSpecialFeePercent(pairMetadata.address),
            ]);

            const cachedKeys = await Promise.all([
                this.pairSetterService.setFirstTokenID(
                    pairMetadata.address,
                    pairMetadata.firstTokenID,
                ),
                this.pairSetterService.setSecondTokenID(
                    pairMetadata.address,
                    pairMetadata.secondTokenID,
                ),
                this.pairSetterService.setTotalFeePercent(
                    pairMetadata.address,
                    totalFeePercent,
                ),
                this.pairSetterService.setSpecialFeePercent(
                    pairMetadata.address,
                    specialFeePercent,
                ),
            ]);
            if (lpTokenID !== undefined) {
                const lpToken = await this.apiService.getToken(lpTokenID);
                cachedKeys.push(
                    await this.pairSetterService.setLpTokenID(
                        pairMetadata.address,
                        lpTokenID,
                    ),
                );
                cachedKeys.push(
                    await this.tokenSetter.setTokenMetadata(lpTokenID, lpToken),
                );
            }
            cachedKeys.push(
                await this.tokenSetter.setTokenMetadata(
                    pairMetadata.firstTokenID,
                    firstToken,
                ),
            );
            cachedKeys.push(
                await this.tokenSetter.setTokenMetadata(
                    pairMetadata.secondTokenID,
                    secondToken,
                ),
            );

            await this.deleteCacheKeys(cachedKeys);
        }
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async cachePairsAnalytics(): Promise<void> {
        const [pairsAddresses, isTimescaleReadActive] = await Promise.all([
            this.routerGetter.getAllPairsAddress(),
            this.elrondDataReadService.isReadActive(),
        ]);
        const time = '24h';
        for (const pairAddress of pairsAddresses) {
            const [
                firstTokenVolume24h,
                secondTokenVolume24h,
                volumeUSD24h,
                feesUSD24h,
            ] = await Promise.all([
                isTimescaleReadActive
                    ? this.elrondDataReadService.getAggregatedValue({
                          series: pairAddress,
                          key: 'firstTokenVolume',
                          start: time,
                      })
                    : this.awsQuery.getAggregatedValue({
                          table: awsConfig.timestream.tableName,
                          series: pairAddress,
                          metric: 'firstTokenVolume',
                          time,
                      }),
                isTimescaleReadActive
                    ? this.elrondDataReadService.getAggregatedValue({
                          series: pairAddress,
                          key: 'secondTokenVolume',
                          start: time,
                      })
                    : this.awsQuery.getAggregatedValue({
                          table: awsConfig.timestream.tableName,
                          series: pairAddress,
                          metric: 'secondTokenVolume',
                          time,
                      }),
                isTimescaleReadActive
                    ? this.elrondDataReadService.getAggregatedValue({
                          series: pairAddress,
                          key: 'volumeUSD',
                          start: time,
                      })
                    : this.awsQuery.getAggregatedValue({
                          table: awsConfig.timestream.tableName,
                          series: pairAddress,
                          metric: 'volumeUSD',
                          time,
                      }),
                isTimescaleReadActive
                    ? this.elrondDataReadService.getAggregatedValue({
                          series: pairAddress,
                          key: 'feesUSD',
                          start: time,
                      })
                    : this.awsQuery.getAggregatedValue({
                          table: awsConfig.timestream.tableName,
                          series: pairAddress,
                          metric: 'feesUSD',
                          time,
                      }),
            ]);

            const cachedKeys = await Promise.all([
                this.pairSetterService.setFirstTokenVolume(
                    pairAddress,
                    firstTokenVolume24h,
                    time,
                ),
                this.pairSetterService.setSecondTokenVolume(
                    pairAddress,
                    secondTokenVolume24h,
                    time,
                ),
                this.pairSetterService.setVolumeUSD(
                    pairAddress,
                    volumeUSD24h,
                    time,
                ),
                this.pairSetterService.setFeesUSD(
                    pairAddress,
                    feesUSD24h,
                    time,
                ),
            ]);
            await this.deleteCacheKeys(cachedKeys);
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cachePairsInfo(): Promise<void> {
        const pairsAddresses = await this.routerGetter.getAllPairsAddress();

        for (const pairAddress of pairsAddresses) {
            const [feesAPR, state, type, feeState, totalFeePercent] =
                await Promise.all([
                    this.pairComputeService.computeFeesAPR(pairAddress),
                    this.abiPairService.getState(pairAddress),
                    this.pairComputeService.computeTypeFromTokens(pairAddress),
                    this.abiPairService.getFeeState(pairAddress),
                    this.abiPairService.getTotalFeePercent(pairAddress),
                ]);

            const cachedKeys = await Promise.all([
                this.pairSetterService.setFeesAPR(pairAddress, feesAPR),
                this.pairSetterService.setState(pairAddress, state),
                this.pairSetterService.setType(pairAddress, type),
                this.pairSetterService.setFeeState(pairAddress, feeState),
                this.pairSetterService.setTotalFeePercent(
                    pairAddress,
                    totalFeePercent,
                ),
            ]);
            await this.deleteCacheKeys(cachedKeys);
        }
    }

    @Cron('*/6 * * * * *') // Update prices and reserves every 6 seconds
    async cacheTokenPrices(): Promise<void> {
        const pairsMetadata = await this.routerGetter.getPairsMetadata();
        const invalidatedKeys = [];
        for (const pairAddress of pairsMetadata) {
            const pairInfo = await this.abiPairService.getPairInfoMetadata(
                pairAddress.address,
            );

            const cachedKeys = await Promise.all([
                this.pairSetterService.setFirstTokenReserve(
                    pairAddress.address,
                    pairInfo.reserves0,
                ),
                this.pairSetterService.setSecondTokenReserve(
                    pairAddress.address,
                    pairInfo.reserves1,
                ),
                this.pairSetterService.setTotalSupply(
                    pairAddress.address,
                    pairInfo.totalSupply,
                ),
            ]);
            invalidatedKeys.push(cachedKeys);
        }

        for (const pairMetadata of pairsMetadata) {
            const [
                firstTokenPrice,
                firstTokenPriceUSD,
                secondTokenPrice,
                secondTokenPriceUSD,
                lpTokenPriceUSD,
            ] = await Promise.all([
                this.pairComputeService.computeFirstTokenPrice(
                    pairMetadata.address,
                ),
                this.pairComputeService.computeFirstTokenPriceUSD(
                    pairMetadata.address,
                ),
                this.pairComputeService.computeSecondTokenPrice(
                    pairMetadata.address,
                ),
                this.pairComputeService.computeSecondTokenPriceUSD(
                    pairMetadata.address,
                ),
                this.pairComputeService.computeLpTokenPriceUSD(
                    pairMetadata.address,
                ),
            ]);

            const cachedKeys = await Promise.all([
                this.pairSetterService.setFirstTokenPrice(
                    pairMetadata.address,
                    firstTokenPrice,
                ),
                this.pairSetterService.setSecondTokenPrice(
                    pairMetadata.address,
                    secondTokenPrice,
                ),
                this.pairSetterService.setFirstTokenPriceUSD(
                    pairMetadata.address,
                    firstTokenPriceUSD,
                ),
                this.pairSetterService.setSecondTokenPriceUSD(
                    pairMetadata.address,
                    secondTokenPriceUSD,
                ),
                this.pairSetterService.setLpTokenPriceUSD(
                    pairMetadata.address,
                    lpTokenPriceUSD,
                ),
            ]);
            invalidatedKeys.push(cachedKeys);
        }
        await this.deleteCacheKeys(invalidatedKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
