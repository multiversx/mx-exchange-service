import { Inject, Injectable } from '@nestjs/common';
import {
    LockedAssetAttributesModel,
    LockedAssetModel,
    UnlockMileStoneModel,
} from '../models/locked-asset.model';
import { constantsConfig, scAddress } from '../../../config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
    BinaryCodec,
    BooleanType,
    ListType,
    FieldDefinition,
    StructType,
    U64Type,
    U8Type,
} from '@elrondnetwork/erdjs/out';
import { DecodeAttributesArgs } from '../../proxy/models/proxy.args';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { LockedAssetGetterService } from './locked.asset.getter.service';
import BigNumber from 'bignumber.js';
import { tokenNonce } from 'src/utils/token.converters';

@Injectable()
export class LockedAssetService {
    constructor(
        private readonly lockedAssetGetter: LockedAssetGetterService,

        private readonly contextGetter: ContextGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getLockedAssetInfo(): Promise<LockedAssetModel> {
        return new LockedAssetModel({ address: scAddress.lockedAssetAddress });
    }

    async decodeLockedAssetAttributes(
        args: DecodeAttributesArgs,
    ): Promise<LockedAssetAttributesModel[]> {
        const decodedBatchAttributes = [];
        const extendedAttributesActivationNonce = await this.lockedAssetGetter.getExtendedAttributesActivationNonce();
        for (const lockedAsset of args.batchAttributes) {
            const attributesBuffer = Buffer.from(
                lockedAsset.attributes,
                'base64',
            );
            const codec = new BinaryCodec();

            const withActivationNonce =
                tokenNonce(lockedAsset.identifier) >=
                extendedAttributesActivationNonce;
            const lockedAssetAttributesStructure = await this.getLockedAssetAttributesStructure(
                withActivationNonce,
            );

            const [decoded] = codec.decodeNested(
                attributesBuffer,
                lockedAssetAttributesStructure,
            );
            const decodedAttributes = decoded.valueOf();

            const unlockMilestones = await this.getUnlockMilestones(
                decodedAttributes.unlockSchedule,
                withActivationNonce,
            );

            decodedBatchAttributes.push(
                new LockedAssetAttributesModel({
                    attributes: lockedAsset.attributes,
                    identifier: lockedAsset.identifier,
                    isMerged: decodedAttributes.isMerged,
                    unlockSchedule: unlockMilestones,
                }),
            );
        }
        return decodedBatchAttributes;
    }

    private async getUnlockMilestones(
        unlockSchedule: any,
        withActivationNonce: boolean,
    ): Promise<UnlockMileStoneModel[]> {
        const unlockMilestones: UnlockMileStoneModel[] = [];
        for (const unlockMilestone of unlockSchedule) {
            const unlockEpoch = unlockMilestone.epoch.toNumber();
            const unlockPercent: BigNumber = withActivationNonce
                ? unlockMilestone.percent.div(
                      constantsConfig.PRECISION_EX_INCREASE,
                  )
                : unlockMilestone.percent;
            const remainingEpochs = await this.getRemainingEpochs(unlockEpoch);

            unlockMilestones.push(
                new UnlockMileStoneModel({
                    percent: unlockPercent.toNumber(),
                    epochs: remainingEpochs > 0 ? remainingEpochs : 0,
                }),
            );
        }

        return unlockMilestones;
    }

    private async getRemainingEpochs(unlockEpoch: number): Promise<number> {
        const [currentEpoch, unlockStartEpoch] = await Promise.all([
            this.contextGetter.getCurrentEpoch(),
            this.getMonthStartEpoch(unlockEpoch),
        ]);
        if (unlockEpoch <= unlockStartEpoch && unlockEpoch <= currentEpoch) {
            return 0;
        } else {
            return unlockStartEpoch + 30 - currentEpoch;
        }
    }

    private async getLockedAssetAttributesStructure(
        withActivationNonce: boolean,
    ): Promise<StructType> {
        return new StructType('LockedAssetAttributes', [
            new FieldDefinition(
                'unlockSchedule',
                '',
                new ListType(
                    new StructType('UnlockMilestone', [
                        new FieldDefinition('epoch', '', new U64Type()),
                        new FieldDefinition(
                            'percent',
                            '',
                            withActivationNonce ? new U64Type() : new U8Type(),
                        ),
                    ]),
                ),
            ),
            new FieldDefinition('isMerged', '', new BooleanType()),
        ]);
    }

    private async getMonthStartEpoch(unlockEpoch: number): Promise<number> {
        const initEpoch = await this.lockedAssetGetter.getInitEpoch();
        return unlockEpoch - ((unlockEpoch - initEpoch) % 30);
    }
}
