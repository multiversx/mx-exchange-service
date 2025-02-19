import { Inject, Injectable } from '@nestjs/common';
import {
    LockedAssetAttributesModel,
    LockedAssetModel,
    UnlockMileStoneModel,
} from '../models/locked-asset.model';
import { constantsConfig, scAddress } from '../../../config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { DecodeAttributesArgs } from '../../proxy/models/proxy.args';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { LockedAssetGetterService } from './locked.asset.getter.service';
import BigNumber from 'bignumber.js';
import { tokenNonce } from 'src/utils/token.converters';
import { LockedAssetAttributes } from '@multiversx/sdk-exchange';

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
        const extendedAttributesActivationNonce =
            await this.lockedAssetGetter.getExtendedAttributesActivationNonce();

        return Promise.all(
            args.batchAttributes.map(async (lockedAsset) => {
                const withActivationNonce =
                    tokenNonce(lockedAsset.identifier) >=
                    extendedAttributesActivationNonce;
                const lockedAssetAttributes =
                    LockedAssetAttributes.fromAttributes(
                        withActivationNonce,
                        lockedAsset.attributes,
                    );
                const unlockSchedule = await this.getUnlockMilestones(
                    lockedAssetAttributes.unlockSchedule,
                    withActivationNonce,
                );

                return new LockedAssetAttributesModel({
                    attributes: lockedAsset.attributes,
                    identifier: lockedAsset.identifier,
                    unlockSchedule,
                    isMerged: lockedAssetAttributes.isMerged,
                });
            }),
        );
    }

    private async getUnlockMilestones(
        unlockSchedule: any,
        withActivationNonce: boolean,
    ): Promise<UnlockMileStoneModel[]> {
        return Promise.all(
            unlockSchedule.map(async (unlockMilestone) => {
                const unlockEpoch = unlockMilestone.epoch.toNumber();
                const unlockPercent: BigNumber = withActivationNonce
                    ? unlockMilestone.percent.div(
                          constantsConfig.PRECISION_EX_INCREASE,
                      )
                    : unlockMilestone.percent;
                const remainingEpochs = await this.getRemainingEpochs(
                    unlockEpoch,
                );

                return new UnlockMileStoneModel({
                    percent: unlockPercent.toNumber(),
                    epochs: remainingEpochs > 0 ? remainingEpochs : 0,
                    unlockEpoch: unlockEpoch,
                });
            }),
        );
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

    private async getMonthStartEpoch(unlockEpoch: number): Promise<number> {
        const initEpoch = await this.lockedAssetGetter.getInitEpoch();
        return unlockEpoch - ((unlockEpoch - initEpoch) % 30);
    }
}
