import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { awsConfig, constantsConfig } from 'src/config';
import { oneHour, oneMinute, oneSecond } from 'src/helpers/helpers';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { AWSTimestreamQueryService } from 'src/services/aws/aws.timestream.query';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { PairInfoModel } from '../models/pair-info.model';
import { PairAbiService } from './pair.abi.service';
import { PairComputeService } from './pair.compute.service';
import { PairDBService } from './pair.db.service';

@Injectable()
export class PairGetterService {
    constructor(
        private readonly contextGetter: ContextGetterService,
        private readonly cachingService: CachingService,
        private readonly abiService: PairAbiService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairComputeService: PairComputeService,
        private readonly pairDbService: PairDBService,
        private readonly awsTimestreamQuery: AWSTimestreamQueryService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        pairAddress: string,
        key: string,
        createValueFunc: () => any,
        ttl: number,
    ): Promise<any> {
        const cacheKey = this.getPairCacheKey(pairAddress, key);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                PairGetterService.name,
                this.getData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getFirstTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'firstTokenID',
            () => this.abiService.getFirstTokenID(pairAddress),
            oneHour(),
        );
    }

    async getSecondTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'secondTokenID',
            () => this.abiService.getSecondTokenID(pairAddress),
            oneHour(),
        );
    }

    async getLpTokenID(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'lpTokenID',
            () => this.abiService.getLpTokenID(pairAddress),
            oneHour(),
        );
    }

    async getFirstToken(pairAddress: string): Promise<EsdtToken> {
        const firstTokenID = await this.getFirstTokenID(pairAddress);
        return this.contextGetter.getTokenMetadata(firstTokenID);
    }

    async getSecondToken(pairAddress: string): Promise<EsdtToken> {
        const secondTokenID = await this.getSecondTokenID(pairAddress);
        return this.contextGetter.getTokenMetadata(secondTokenID);
    }

    async getLpToken(pairAddress: string): Promise<EsdtToken> {
        const lpTokenID = await this.getLpTokenID(pairAddress);
        return this.contextGetter.getTokenMetadata(lpTokenID);
    }

    async getTokenPrice(pairAddress: string, tokenID: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.getFirstTokenID(pairAddress),
            this.getSecondTokenID(pairAddress),
        ]);

        switch (tokenID) {
            case firstTokenID:
                return this.getFirstTokenPrice(pairAddress);
            case secondTokenID:
                return this.getSecondTokenPrice(pairAddress);
        }
    }

    async getFirstTokenPrice(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'firstTokenPrice',
            () => this.pairComputeService.computeFirstTokenPrice(pairAddress),
            oneSecond() * 12,
        );
    }

    async getSecondTokenPrice(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'secondTokenPrice',
            () => this.pairComputeService.computeSecondTokenPrice(pairAddress),
            oneSecond() * 12,
        );
    }

    async getTokenPriceUSD(tokenID: string): Promise<string> {
        return await this.getData(
            'priceUSD',
            tokenID,
            () => this.pairComputeService.computeTokenPriceUSD(tokenID),
            oneMinute(),
        );
    }

    async getFirstTokenPriceUSD(pairAddress: string): Promise<string> {
        return await this.getData(
            pairAddress,
            'firstTokenPriceUSD',
            () =>
                this.pairComputeService.computeFirstTokenPriceUSD(pairAddress),
            oneSecond() * 12,
        );
    }

    async getSecondTokenPriceUSD(pairAddress: string): Promise<string> {
        return await this.getData(
            pairAddress,
            'secondTokenPriceUSD',
            () =>
                this.pairComputeService.computeSecondTokenPriceUSD(pairAddress),
            oneSecond() * 12,
        );
    }

    async getLpTokenPriceUSD(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'lpTokenPriceUSD',
            () => this.pairComputeService.computeLpTokenPriceUSD(pairAddress),
            oneSecond() * 12,
        );
    }

    async getFirstTokenReserve(pairAddress: string): Promise<string> {
        const tokenID = await this.getFirstTokenID(pairAddress);
        return this.getData(
            pairAddress,
            'firstTokenReserve',
            () => this.abiService.getTokenReserve(pairAddress, tokenID),
            oneSecond() * 12,
        );
    }

    async getSecondTokenReserve(pairAddress: string): Promise<string> {
        const tokenID = await this.getSecondTokenID(pairAddress);
        return this.getData(
            pairAddress,
            'secondTokenReserve',
            () => this.abiService.getTokenReserve(pairAddress, tokenID),
            oneSecond() * 12,
        );
    }

    async getTotalSupply(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'totalSupply',
            () => this.abiService.getTotalSupply(pairAddress),
            oneSecond() * 12,
        );
    }

    async getFirstTokenLockedValueUSD(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'firstTokenLockedValueUSD',
            () =>
                this.pairComputeService.computeFirstTokenLockedValueUSD(
                    pairAddress,
                ),
            oneMinute(),
        );
    }

    async getSecondTokenLockedValueUSD(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'secondTokenLockedValueUSD',
            () =>
                this.pairComputeService.computeSecondTokenLockedValueUSD(
                    pairAddress,
                ),
            oneMinute(),
        );
    }

    async getLockedValueUSD(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'lockedValueUSD',
            () => this.pairComputeService.computeLockedValueUSD(pairAddress),
            oneMinute(),
        );
    }

    async getFirstTokenVolume(
        pairAddress: string,
        time: string,
    ): Promise<string> {
        return this.getData(
            pairAddress,
            `firstTokenVolume.${time}`,
            () =>
                this.awsTimestreamQuery.getAggregatedValue({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'firstTokenVolume',
                    time,
                }),
            oneMinute(),
        );
    }

    async getSecondTokenVolume(
        pairAddress: string,
        time: string,
    ): Promise<string> {
        return this.getData(
            pairAddress,
            `secondTokenVolume.${time}`,
            () =>
                this.awsTimestreamQuery.getAggregatedValue({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'secondTokenVolume',
                    time,
                }),
            oneMinute(),
        );
    }

    async getVolumeUSD(pairAddress: string, time: string): Promise<string> {
        return this.getData(
            pairAddress,
            `volumeUSD.${time}`,
            () =>
                this.awsTimestreamQuery.getAggregatedValue({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'volumeUSD',
                    time,
                }),
            oneMinute(),
        );
    }

    async getFeesUSD(pairAddress: string, time: string): Promise<string> {
        return this.getData(
            pairAddress,
            `feesUSD.${time}`,
            () =>
                this.awsTimestreamQuery.getAggregatedValue({
                    table: awsConfig.timestream.tableName,
                    series: pairAddress,
                    metric: 'feesUSD',
                    time,
                }),
            oneMinute(),
        );
    }

    async getFeesAPR(pairAddress: string): Promise<string> {
        return this.getData(
            pairAddress,
            'feesAPR',
            () => this.pairComputeService.computeFeesAPR(pairAddress),
            oneMinute(),
        );
    }

    async getPairInfoMetadata(pairAddress: string): Promise<PairInfoModel> {
        const [
            firstTokenReserve,
            secondTokenReserve,
            totalSupply,
        ] = await Promise.all([
            this.getFirstTokenReserve(pairAddress),
            this.getSecondTokenReserve(pairAddress),
            this.getTotalSupply(pairAddress),
        ]);

        return new PairInfoModel({
            reserves0: firstTokenReserve,
            reserves1: secondTokenReserve,
            totalSupply: totalSupply,
        });
    }

    async getTotalFeePercent(pairAddress: string): Promise<number> {
        const totalFeePercent = await this.getData(
            pairAddress,
            'totalFeePercent',
            () => this.abiService.getTotalFeePercent(pairAddress),
            oneHour(),
        );
        return new BigNumber(totalFeePercent)
            .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
            .toNumber();
    }

    async getSpecialFeePercent(pairAddress: string): Promise<number> {
        const specialFeePercent = await this.getData(
            pairAddress,
            'specialFeePercent',
            () => this.abiService.getSpecialFeePercent(pairAddress),
            oneHour(),
        );
        return new BigNumber(specialFeePercent)
            .dividedBy(constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS)
            .toNumber();
    }

    async getState(pairAddress: string): Promise<string> {
        return await this.getData(
            pairAddress,
            'state',
            () => this.abiService.getState(pairAddress),
            oneSecond() * 45,
        );
    }

    async getBurnedTokenAmount(
        pairAddress: string,
        tokenID: string,
    ): Promise<string> {
        return await this.getData(
            pairAddress,
            `${tokenID}.burnedTokenAmount`,
            () => this.abiService.getBurnedTokenAmount(pairAddress, tokenID),
            oneMinute(),
        );
    }

    async getType(pairAddress: string): Promise<string> {
        return await this.getData(
            pairAddress,
            'type',
            () => this.pairDbService.getPairType(pairAddress),
            oneMinute(),
        );
    }

    private getPairCacheKey(pairAddress: string, ...args: any) {
        return generateCacheKeyFromParams('pair', pairAddress, ...args);
    }
}
