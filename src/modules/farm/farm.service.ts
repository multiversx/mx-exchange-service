import { Inject, Injectable } from '@nestjs/common';
import {
    BigUIntType,
    BooleanType,
    StructFieldDefinition,
    StructType,
    U64Type,
    U8Type,
} from '@elrondnetwork/erdjs/out/smartcontracts/typesystem';
import { BinaryCodec } from '@elrondnetwork/erdjs';
import { cacheConfig, farmsConfig, scAddress } from '../../config';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import {
    FarmModel,
    FarmTokenAttributesModel,
    RewardsModel,
} from './models/farm.model';
import { AbiFarmService } from './abi-farm.service';
import { CalculateRewardsArgs } from './models/farm.args';
import { PairService } from '../pair/pair.service';
import { ContextService } from '../../services/context/context.service';
import { NftCollection } from '../../models/tokens/nftCollection.model';
import * as Redis from 'ioredis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RedisCacheService } from '../../services/redis-cache.service';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../utils/generate-log-message';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';

@Injectable()
export class FarmService {
    private redisClient: Redis.Redis;

    constructor(
        private readonly abiService: AbiFarmService,
        private readonly apiService: ElrondApiService,
        private readonly redisCacheService: RedisCacheService,
        private readonly context: ContextService,
        private readonly pairService: PairService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.redisClient = this.redisCacheService.getClient();
    }

    private async getTokenID(
        farmAddress: string,
        tokenCacheKey: string,
        createValueFunc: () => any,
    ): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, tokenCacheKey);
        try {
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                createValueFunc,
                cacheConfig.token,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmService.name,
                this.getTokenID.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getFarmedTokenID(farmAddress: string): Promise<string> {
        return this.getTokenID(farmAddress, 'farmedTokenID', () =>
            this.abiService.getFarmedTokenID(farmAddress),
        );
    }

    async getFarmTokenID(farmAddress: string): Promise<string> {
        return this.getTokenID(farmAddress, 'farmTokenID', () =>
            this.abiService.getFarmTokenID(farmAddress),
        );
    }

    async getFarmingTokenID(farmAddress: string): Promise<string> {
        return this.getTokenID(farmAddress, 'farmingTokenID', () =>
            this.abiService.getFarmingTokenID(farmAddress),
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
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getFarmTokenSupply,
                cacheConfig.reserves,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmService.name,
                this.getFarmTokenSupply.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
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
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getFarmingTokenReserve,
                cacheConfig.reserves,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmService.name,
                this.getFarmingTokenReserve.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getRewardsPerBlock(farmAddress: string): Promise<string> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'rewardsPerBlock');
        try {
            const getRewardsPerBlock = () =>
                this.abiService.getRewardsPerBlock(farmAddress);
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getRewardsPerBlock,
                cacheConfig.default,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmService.name,
                this.getRewardsPerBlock.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getPenaltyPercent(farmAddress: string): Promise<number> {
        const cacheKey = this.getFarmCacheKey(farmAddress, 'penaltyPercent');
        try {
            const getPenaltyPercent = () =>
                this.abiService.getPenaltyPercent(farmAddress);
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getPenaltyPercent,
                cacheConfig.default,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmService.name,
                this.getPenaltyPercent.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
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
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getMinimumFarmingEpochs,
                cacheConfig.default,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmService.name,
                this.getMinimumFarmingEpochs.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

    async getState(farmAddress: string): Promise<string> {
        return this.abiService.getState(farmAddress);
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

    async getFarmAddressByFarmTokenID(tokenID: string): Promise<string | null> {
        for (const farmAddress of farmsConfig) {
            const farmTokenID = await this.getFarmTokenID(farmAddress);
            if (farmTokenID === tokenID) {
                return farmAddress;
            }
        }
        return null;
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

        let remainingFarmingEpochs = 0;
        if (farmTokenAttributes.lockedRewards) {
            const [currentEpoch, minimumFarmingEpochs] = await Promise.all([
                this.apiService.getCurrentEpoch(),
                this.getMinimumFarmingEpochs(args.farmAddress),
            ]);
            remainingFarmingEpochs = Math.max(
                0,
                minimumFarmingEpochs -
                    (currentEpoch - farmTokenAttributes.enteringEpoch),
            );
        }

        return {
            decodedAttributes: farmTokenAttributes,
            remainingFarmingEpochs: remainingFarmingEpochs,
            rewards: rewards.toFixed(),
        };
    }

    async getFarmedTokenPriceUSD(farmAddress: string): Promise<string> {
        const farmedTokenID = await this.getFarmedTokenID(farmAddress);
        if (scAddress.has(farmedTokenID)) {
            const pairAddress = scAddress.get(farmedTokenID);
            const tokenPriceUSD = await this.pairService.getTokenPriceUSD(
                pairAddress,
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
        const farmingTokenID = await this.getFarmingTokenID(farmAddress);
        if (scAddress.has(farmingTokenID)) {
            const pairAddress = scAddress.get(farmingTokenID);
            const tokenPriceUSD = await this.pairService.getTokenPriceUSD(
                pairAddress,
                farmingTokenID,
            );
            return tokenPriceUSD.toFixed();
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );
        return this.pairService.getLpTokenPriceUSD(pairAddress);
    }

    decodeFarmTokenAttributes(
        identifier: string,
        attributes: string,
    ): FarmTokenAttributesModel {
        const attributesBuffer = Buffer.from(attributes, 'base64');
        const codec = new BinaryCodec();

        const structType = this.getFarmTokenAttributesStructure();

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

    getFarmTokenAttributesStructure(): StructType {
        return new StructType('FarmTokenAttributes', [
            new StructFieldDefinition('rewardPerShare', '', new BigUIntType()),
            new StructFieldDefinition('enteringEpoch', '', new U64Type()),
            new StructFieldDefinition('aprMultiplier', '', new U8Type()),
            new StructFieldDefinition(
                'withLockedRewards',
                '',
                new BooleanType(),
            ),
            new StructFieldDefinition(
                'initialFarmingAmount',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'compoundedReward',
                '',
                new BigUIntType(),
            ),
            new StructFieldDefinition(
                'currentFarmAmount',
                '',
                new BigUIntType(),
            ),
        ]);
    }

    private getFarmCacheKey(farmAddress: string, ...args: any) {
        return generateCacheKeyFromParams('farm', farmAddress, ...args);
    }
}
