import { Inject, Injectable } from '@nestjs/common';
import { AbiLockedAssetService } from './abi-locked-asset.service';
import {
    LockedAssetAttributes,
    LockedAssetModel,
    UnlockMileStoneModel,
} from './models/locked-asset.model';
import { cacheConfig, scAddress } from '../../config';
import { ContextService } from '../../services/context/context.service';
import { NftCollection } from '../../models/tokens/nftCollection.model';
import { RedisCacheService } from '../../services/redis-cache.service';
import * as Redis from 'ioredis';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
    BinaryCodec,
    BooleanType,
    ListType,
    StructFieldDefinition,
    StructType,
    U64Type,
    U8Type,
} from '@elrondnetwork/erdjs/out';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';

@Injectable()
export class LockedAssetService {
    private redisClient: Redis.Redis;
    constructor(
        private readonly abiService: AbiLockedAssetService,
        private apiService: ElrondApiService,
        private readonly redisCacheService: RedisCacheService,
        private context: ContextService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.redisClient = this.redisCacheService.getClient();
    }

    async getLockedAssetInfo(): Promise<LockedAssetModel> {
        return new LockedAssetModel({ address: scAddress.lockedAssetAddress });
    }

    async getLockedTokenID(): Promise<string> {
        try {
            const cacheKey = this.getLockedAssetFactoryCacheKey(
                'lockedTokenID',
            );
            const getLockedTokenID = () => this.abiService.getLockedTokenID();
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getLockedTokenID,
                cacheConfig.token,
            );
        } catch (error) {
            this.logger.error(
                `An error occurred while get locked asset tokenID`,
                error,
                {
                    path: 'LockedAssetService.getLockedTokenID',
                },
            );
        }
    }

    async getLockedToken(): Promise<NftCollection> {
        const lockedTokenID = await this.getLockedTokenID();
        return await this.context.getNftCollectionMetadata(lockedTokenID);
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        try {
            const cacheKey = this.getLockedAssetFactoryCacheKey(
                'defaultUnlockPeriod',
            );
            const getDefaultUnlockPeriod = () =>
                this.abiService.getDefaultUnlockPeriod();
            return this.redisCacheService.getOrSet(
                this.redisClient,
                cacheKey,
                getDefaultUnlockPeriod,
                cacheConfig.default,
            );
        } catch (error) {
            this.logger.error(
                `An error occurred while get loked asset default unlock period`,
                error,
                {
                    path: 'LockedAssetService.getDefaultUnlockPeriod',
                },
            );
        }
    }

    private getLockedAssetFactoryCacheKey(...args: any) {
        return generateCacheKeyFromParams('lockedAssetFactory', ...args);
    }

    async decodeLockedAssetAttributes(
        args: DecodeAttributesArgs,
    ): Promise<LockedAssetAttributes[]> {
        const decodedBatchAttributes = [];
        const currentEpoch = await this.apiService.getCurrentEpoch();
        for (const lockedAsset of args.batchAttributes) {
            const attributesBuffer = Buffer.from(
                lockedAsset.attributes,
                'base64',
            );
            const codec = new BinaryCodec();

            const lockedAssetAttributesStructure = this.getLockedAssetAttributesStructure();

            const [decoded, decodedLength] = codec.decodeNested(
                attributesBuffer,
                lockedAssetAttributesStructure,
            );
            const decodedAttributes = decoded.valueOf();
            const unlockSchedule = decodedAttributes.unlockSchedule.map(
                unlockMilestone => {
                    const epoch = unlockMilestone.epoch - currentEpoch;
                    return new UnlockMileStoneModel({
                        percent: unlockMilestone.percent,
                        epochs: epoch > 0 ? epoch : 0,
                    });
                },
            );
            decodedBatchAttributes.push(
                new LockedAssetAttributes({
                    attributes: lockedAsset.attributes,
                    identifier: lockedAsset.identifier,
                    isMerged: decodedAttributes.isMerged,
                    unlockSchedule: unlockSchedule,
                }),
            );
        }
        return decodedBatchAttributes;
    }

    private getLockedAssetAttributesStructure(): StructType {
        return new StructType('LockedAssetAttributes', [
            new StructFieldDefinition(
                'unlockSchedule',
                '',
                new ListType(
                    new StructType('UnlockMilestone', [
                        new StructFieldDefinition('epoch', '', new U64Type()),
                        new StructFieldDefinition('percent', '', new U8Type()),
                    ]),
                ),
            ),
            new StructFieldDefinition('isMerged', '', new BooleanType()),
        ]);
    }
}
