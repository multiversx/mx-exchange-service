import { Inject, Injectable } from '@nestjs/common';
import { BinaryCodec } from '@elrondnetwork/erdjs';
import {
    cacheConfig,
    constantsConfig,
    farmsConfig,
    scAddress,
} from '../../config';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import {
    ExitFarmTokensModel,
    FarmModel,
    RewardsModel,
} from './models/farm.model';
import { AbiFarmService } from './abi-farm.service';
import { CalculateRewardsArgs } from './models/farm.args';
import { PairService } from '../pair/pair.service';
import { ContextService } from '../../services/context/context.service';
import { NftCollection } from '../../models/tokens/nftCollection.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CachingService } from '../../services/caching/cache.service';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../utils/generate-log-message';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import BigNumber from 'bignumber.js';
import { oneHour, oneMinute, ruleOfThree } from '../../helpers/helpers';
import { FarmTokenAttributesModel } from './models/farmTokenAttributes.model';

@Injectable()
export class FarmService {
    constructor(
        private readonly abiService: AbiFarmService,
        private readonly apiService: ElrondApiService,
        private readonly cachingService: CachingService,
        private readonly context: ContextService,
        private readonly pairService: PairService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getTokenData(
        farmAddress: string,
        tokenCacheKey: string,
        createValueFunc: () => any,
        ttl: number = cacheConfig.default,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, tokenCacheKey);
        try {
            return this.cachingService.getOrSet(cacheKey, createValueFunc, ttl);
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmService.name,
                this.getTokenData.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        return this.getTokenData(
            farmAddress,
            'farmedTokenID',
            () => this.abiService.getFarmedTokenID(farmAddress),
            oneHour(),
        );
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        return this.getTokenData(
            farmAddress,
            'farmTokenID',
            () => this.abiService.getFarmTokenID(farmAddress),
            oneHour(),
        );
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        return this.getTokenData(
            farmAddress,
            'farmingTokenID',
            () => this.abiService.getFarmingTokenID(farmAddress),
            oneHour(),
        );
    }

    async getFarmedToken(farmAddress: string): Promise<EsdtToken> {
        const farmedTokenID = await this.getFarmedTokenID(farmAddress);
        return this.context.getTokenMetadata(farmedTokenID);
    }

    async getFarmToken(farmAddress: string): Promise<NftCollection> {
        const farmTokenID = await this.getFarmTokenID(farmAddress);
        return this.context.getNftCollectionMetadata(farmTokenID);
    }

    async getFarmingToken(farmAddress: string): Promise<EsdtToken> {
        const farmingTokenID = await this.getFarmingTokenID(farmAddress);
        return this.context.getTokenMetadata(farmingTokenID);
    }

    async getFarmTokenSupply(farmAddress: string): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'farmTokenSupply');
        try {
            const getFarmTokenSupply = () =>
                this.abiService.getFarmTokenSupply(farmAddress);
            return this.cachingService.getOrSet(
                cacheKey,
                getFarmTokenSupply,
                oneMinute(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmService.name,
                this.getFarmTokenSupply.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getFarmingTokenReserve(farmAddress: string): Promise<string> {
        const cacheKey = this.getFarmCacheKey(
            farmAddress,
            'farmingTokenReserve',
        );
        try {
            const getFarmingTokenReserve = () =>
                this.abiService.getFarmingTokenReserve(farmAddress);
            return this.cachingService.getOrSet(
                cacheKey,
                getFarmingTokenReserve,
                oneMinute(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmService.name,
                this.getFarmingTokenReserve.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'rewardsPerBlock');
        try {
            const getRewardsPerBlock = () =>
                this.abiService.getRewardsPerBlock(farmAddress);
            return this.cachingService.getOrSet(
                cacheKey,
                getRewardsPerBlock,
                oneHour(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmService.name,
                this.getRewardsPerBlock.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getPenaltyPercent(farmAddress: string): Promise<number> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'penaltyPercent');
        try {
            const getPenaltyPercent = () =>
                this.abiService.getPenaltyPercent(farmAddress);
            return this.cachingService.getOrSet(
                cacheKey,
                getPenaltyPercent,
                oneHour(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmService.name,
                this.getPenaltyPercent.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getMinimumFarmingEpochs(farmAddress: string): Promise<number> {
        const cacheKey = this.getFarmCacheKey(
            farmAddress,
            'minimumFarmingEpochs',
        );
        try {
            const getMinimumFarmingEpochs = () =>
                this.abiService.getMinimumFarmingEpochs(farmAddress);
            return this.cachingService.getOrSet(
                cacheKey,
                getMinimumFarmingEpochs,
                oneHour(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmService.name,
                this.getMinimumFarmingEpochs.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getState(farmAddress: string): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'state');
        try {
            const getState = () => this.abiService.getState(farmAddress);
            return this.cachingService.getOrSet(cacheKey, getState, oneHour());
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmService.name,
                this.getState.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    getFarms(): FarmModel[] {
        const farms: Array<FarmModel> = [];
        for (const farmAddress of farmsConfig) {
            farms.push(new FarmModel({ address: farmAddress }));
        }

        return farms;
    }

    async isFarmToken(tokenID: string): Promise<boolean> {
        for (const farmAddress of farmsConfig) {
            const farmTokenID = await this.getFarmTokenID(farmAddress);
            if (tokenID === farmTokenID) {
                return true;
            }
        }
        return false;
    }

    async getFarmAddressByFarmTokenID(
        tokenID: string,
    ): Promise<string | undefined> {
        for (const farmAddress of farmsConfig) {
            const farmTokenID = await this.getFarmTokenID(farmAddress);
            if (farmTokenID === tokenID) {
                return farmAddress;
            }
        }
        return undefined;
    }

    async getRewardsForPosition(
        args: CalculateRewardsArgs,
    ): Promise<RewardsModel> {
        const rewards = await this.abiService.calculateRewardsForGivenPosition(
            args,
        );
        const farmTokenAttributes = this.decodeFarmTokenAttributes(
            args.identifier,
            args.attributes,
        );

        const [currentEpoch, minimumFarmingEpochs] = await Promise.all([
            this.context.getCurrentEpoch(),
            this.getMinimumFarmingEpochs(args.farmAddress),
        ]);

        const remainingFarmingEpochs = Math.max(
            0,
            minimumFarmingEpochs -
                (currentEpoch - farmTokenAttributes.enteringEpoch),
        );
        return new RewardsModel({
            decodedAttributes: farmTokenAttributes,
            remainingFarmingEpochs: remainingFarmingEpochs,
            rewards: rewards.toFixed(),
        });
    }

    async getFarmedTokenPriceUSD(farmAddress: string): Promise<string> {
        return this.getTokenData(
            farmAddress,
            'farmedTokenPriceUSD',
            () => this.computeFarmedTokenPriceUSD(farmAddress),
            oneMinute(),
        );
    }

    async computeFarmedTokenPriceUSD(farmAddress: string): Promise<string> {
        const farmedTokenID = await this.getFarmedTokenID(farmAddress);
        if (scAddress.has(farmedTokenID)) {
            const tokenPriceUSD = await this.pairService.computeTokenPriceUSD(
                farmedTokenID,
            );
            return tokenPriceUSD.toFixed();
        }

        const tokenPriceUSD = await this.pairService.getPriceUSDByPath(
            farmedTokenID,
        );
        return tokenPriceUSD.toFixed();
    }

    async getFarmTokenPriceUSD(farmAddress: string): Promise<string> {
        return this.getFarmingTokenPriceUSD(farmAddress);
    }

    async getFarmingTokenPriceUSD(farmAddress: string): Promise<string> {
        return this.getTokenData(
            farmAddress,
            'farmingTokenPriceUSD',
            () => this.computeFarmingTokenPriceUSD(farmAddress),
            oneMinute(),
        );
    }

    async computeFarmingTokenPriceUSD(farmAddress: string): Promise<string> {
        const farmingTokenID = await this.getFarmingTokenID(farmAddress);
        if (scAddress.has(farmingTokenID)) {
            const tokenPriceUSD = await this.pairService.computeTokenPriceUSD(
                farmingTokenID,
            );
            return tokenPriceUSD.toFixed();
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );
        return this.pairService.getLpTokenPriceUSD(pairAddress);
    }

    async getTokensForExitFarm(
        args: CalculateRewardsArgs,
    ): Promise<ExitFarmTokensModel> {
        const decodedAttributes = this.decodeFarmTokenAttributes(
            args.identifier,
            args.attributes,
        );
        let initialFarmingAmount = ruleOfThree(
            new BigNumber(args.liquidity),
            new BigNumber(decodedAttributes.currentFarmAmount),
            new BigNumber(decodedAttributes.initialFarmingAmount),
        );
        const rewardsForPosition = await this.getRewardsForPosition(args);
        let rewards = new BigNumber(rewardsForPosition.rewards);
        rewards = rewards.plus(
            ruleOfThree(
                new BigNumber(args.liquidity),
                new BigNumber(decodedAttributes.currentFarmAmount),
                new BigNumber(decodedAttributes.compoundedReward),
            ),
        );

        if (rewardsForPosition.remainingFarmingEpochs > 0) {
            const penaltyPercent = await this.getPenaltyPercent(
                args.farmAddress,
            );
            initialFarmingAmount = initialFarmingAmount.minus(
                initialFarmingAmount
                    .multipliedBy(penaltyPercent)
                    .dividedBy(constantsConfig.MAX_PENALTY_PERCENT)
                    .integerValue(),
            );
            rewards = rewards.minus(
                rewards
                    .multipliedBy(penaltyPercent)
                    .dividedBy(constantsConfig.MAX_PENALTY_PERCENT)
                    .integerValue(),
            );
        }

        return new ExitFarmTokensModel({
            farmingTokens: initialFarmingAmount.toFixed(),
            rewards: rewards.toFixed(),
        });
    }

    decodeFarmTokenAttributes(
        identifier: string,
        attributes: string,
    ): FarmTokenAttributesModel {
        const attributesBuffer = Buffer.from(attributes, 'base64');
        const codec = new BinaryCodec();

        const structType = FarmTokenAttributesModel.getStructure();

        const [decoded, decodedLength] = codec.decodeNested(
            attributesBuffer,
            structType,
        );

        const decodedAttributes = decoded.valueOf();
        const farmTokenAttributes = FarmTokenAttributesModel.fromDecodedAttributes(
            decodedAttributes,
        );
        farmTokenAttributes.attributes = attributes;
        farmTokenAttributes.identifier = identifier;
        return farmTokenAttributes;
    }

    getFarmCacheKey(farmAddress: string, ...args: any) {
        return generateCacheKeyFromParams('farm', farmAddress, ...args);
    }
}
