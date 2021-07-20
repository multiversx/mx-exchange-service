import { Injectable } from '@nestjs/common';
import { CacheLockedAssetService } from '../../services/cache-manager/cache-locked-asset.service';
import { AbiLockedAssetService } from './abi-locked-asset.service';
import {
    LockedAssetAttributes,
    LockedAssetModel,
    UnlockMileStoneModel,
} from './models/locked-asset.model';
import { scAddress } from '../../config';
import { ContextService } from '../../services/context/context.service';
import { NftCollection } from '../../models/tokens/nftCollection.model';
import {
    BinaryCodec,
    BooleanType,
    ListType,
    StructFieldDefinition,
    StructType,
    U64Type,
    U8Type,
} from '@elrondnetwork/erdjs/out';
import { DecodeAttributesArgs } from '../proxy/dto/proxy.args';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';

@Injectable()
export class LockedAssetService {
    constructor(
        private abiService: AbiLockedAssetService,
        private cacheService: CacheLockedAssetService,
        private context: ContextService,
        private apiService: ElrondApiService,
    ) {}

    async getLockedAssetInfo(): Promise<LockedAssetModel> {
        const lockedAssetInfo = new LockedAssetModel();
        lockedAssetInfo.address = scAddress.lockedAssetAddress;
        return lockedAssetInfo;
    }

    async getLockedToken(): Promise<NftCollection> {
        const lockedTokenID = await this.getLockedTokenID();
        return await this.context.getNftCollectionMetadata(lockedTokenID);
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        const cachedData = await this.cacheService.getMilestones();
        if (!!cachedData) {
            return cachedData.milestones;
        }
        const unlockMilestones = await this.abiService.getDefaultUnlockPeriod();
        this.cacheService.setMilestones({ milestones: unlockMilestones });
        return unlockMilestones;
    }

    async getLockedTokenID(): Promise<string> {
        const cachedData = await this.cacheService.getLockedTokenID();
        if (!!cachedData) {
            return cachedData.lockedTokenID;
        }
        const lockedTokenID = await this.abiService.getLockedTokenID();
        this.cacheService.setLockedTokenID({ lockedTokenID: lockedTokenID });
        return lockedTokenID;
    }

    async decodeLockedAssetAttributes(
        args: DecodeAttributesArgs,
    ): Promise<LockedAssetAttributes[]> {
        const decodedBatchAttributes = [];
        const currentEpoch = await this.apiService.getCurrentEpoch();
        for (const attributes of args.batchAttributes) {
            const attributesBuffer = Buffer.from(
                attributes.attributes,
                'base64',
            );
            const codec = new BinaryCodec();

            const structType = new StructType('LockedAssetAttributes', [
                new StructFieldDefinition(
                    'unlockSchedule',
                    '',
                    new ListType(
                        new StructType('UnlockMilestone', [
                            new StructFieldDefinition(
                                'epoch',
                                '',
                                new U64Type(),
                            ),
                            new StructFieldDefinition(
                                'percent',
                                '',
                                new U8Type(),
                            ),
                        ]),
                    ),
                ),
                new StructFieldDefinition('isMerged', '', new BooleanType()),
            ]);

            const [decoded, decodedLength] = codec.decodeNested(
                attributesBuffer,
                structType,
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
                    attributes: attributes.attributes,
                    identifier: attributes.identifier,
                    isMerged: decodedAttributes.isMerged,
                    unlockSchedule: unlockSchedule,
                }),
            );
        }
        return decodedBatchAttributes;
    }
}
