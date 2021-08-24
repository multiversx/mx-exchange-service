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
import { CachingService } from '../../services/caching/cache.service';
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
import { generateGetLogMessage } from '../../utils/generate-log-message';

@Injectable()
export class LockedAssetService {
    constructor(
        private readonly abiService: AbiLockedAssetService,
        private apiService: ElrondApiService,
        private readonly cachingService: CachingService,
        private context: ContextService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getLockedAssetInfo(): Promise<LockedAssetModel> {
        return new LockedAssetModel({ address: scAddress.lockedAssetAddress });
    }

    async getLockedTokenID(): Promise<string> {
        const cacheKey = this.getLockedAssetFactoryCacheKey('lockedTokenID');
        try {
            const getLockedTokenID = () => this.abiService.getLockedTokenID();
            return this.cachingService.getOrSet(
                cacheKey,
                getLockedTokenID,
                cacheConfig.token,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                LockedAssetService.name,
                this.getLockedTokenID.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getLockedToken(): Promise<NftCollection> {
        const lockedTokenID = await this.getLockedTokenID();
        return await this.context.getNftCollectionMetadata(lockedTokenID);
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        const cacheKey = this.getLockedAssetFactoryCacheKey(
            'defaultUnlockPeriod',
        );
        try {
            const getDefaultUnlockPeriod = () =>
                this.abiService.getDefaultUnlockPeriod();
            return this.cachingService.getOrSet(
                cacheKey,
                getDefaultUnlockPeriod,
                cacheConfig.default,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                LockedAssetService.name,
                this.getLockedTokenID.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    private getLockedAssetFactoryCacheKey(...args: any) {
        return generateCacheKeyFromParams('lockedAssetFactory', ...args);
    }

    async decodeLockedAssetAttributes(
        args: DecodeAttributesArgs,
    ): Promise<LockedAssetAttributes[]> {
        const decodedBatchAttributes = [];
        const currentEpoch = await this.context.getCurrentEpoch();
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
