import { Inject, Injectable } from '@nestjs/common';
import {
    LockedAssetAttributes,
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
    StructFieldDefinition,
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
    ): Promise<LockedAssetAttributes[]> {
        const decodedBatchAttributes = [];
        const [
            currentEpoch,
            extendedAttributesActivationNonce,
        ] = await Promise.all([
            this.contextGetter.getCurrentEpoch(),
            this.lockedAssetGetter.getExtendedAttributesActivationNonce(),
        ]);
        for (const lockedAsset of args.batchAttributes) {
            const attributesBuffer = Buffer.from(
                lockedAsset.attributes,
                'base64',
            );
            const codec = new BinaryCodec();

            const withActivationNonce =
                tokenNonce(lockedAsset.identifier) >
                extendedAttributesActivationNonce;
            const lockedAssetAttributesStructure = await this.getLockedAssetAttributesStructure(
                withActivationNonce,
            );

            const [decoded] = codec.decodeNested(
                attributesBuffer,
                lockedAssetAttributesStructure,
            );
            const decodedAttributes = decoded.valueOf();

            const unlockMilestones = [];
            for (const unlockMilestone of decodedAttributes.unlockSchedule) {
                const unlockEpoch = unlockMilestone.epoch.toNumber();
                const unlockPercent: BigNumber = withActivationNonce
                    ? unlockMilestone.percent.div(
                          constantsConfig.PRECISION_EX_INCREASE,
                      )
                    : unlockMilestone.percent;
                const unlockStartEpoch = await this.getMonthStartEpoch(
                    unlockEpoch,
                );
                let remainingEpochs: number;
                if (
                    unlockEpoch <= unlockStartEpoch &&
                    unlockEpoch <= currentEpoch
                ) {
                    remainingEpochs = 0;
                } else {
                    remainingEpochs = unlockStartEpoch + 30 - currentEpoch;
                }
                unlockMilestones.push(
                    new UnlockMileStoneModel({
                        percent: unlockPercent.toNumber(),
                        epochs: remainingEpochs > 0 ? remainingEpochs : 0,
                    }),
                );
            }

            decodedBatchAttributes.push(
                new LockedAssetAttributes({
                    attributes: lockedAsset.attributes,
                    identifier: lockedAsset.identifier,
                    isMerged: decodedAttributes.isMerged,
                    unlockSchedule: unlockMilestones,
                }),
            );
        }
        return decodedBatchAttributes;
    }

    private async getLockedAssetAttributesStructure(
        withActivationNonce: boolean,
    ): Promise<StructType> {
        return new StructType('LockedAssetAttributes', [
            new StructFieldDefinition(
                'unlockSchedule',
                '',
                new ListType(
                    new StructType('UnlockMilestone', [
                        new StructFieldDefinition('epoch', '', new U64Type()),
                        new StructFieldDefinition(
                            'percent',
                            '',
                            withActivationNonce ? new U64Type() : new U8Type(),
                        ),
                    ]),
                ),
            ),
            new StructFieldDefinition('isMerged', '', new BooleanType()),
        ]);
    }

    private async getMonthStartEpoch(unlockEpoch: number): Promise<number> {
        const initEpoch = await this.lockedAssetGetter.getInitEpoch();
        return unlockEpoch - ((unlockEpoch - initEpoch) % 30);
    }
}
