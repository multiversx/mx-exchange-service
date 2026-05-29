import { Injectable } from '@nestjs/common';
import { scAddress } from 'src/config';
import { UnlockMileStoneModel } from '../models/locked-asset.model';
import { MXProxyService } from 'src/services/multiversx-communication/mx.proxy.service';
import { GenericAbiService } from 'src/services/generics/generic.abi.service';

@Injectable()
export class AbiLockedAssetService extends GenericAbiService {
    constructor(protected readonly mxProxy: MXProxyService) {
        super(mxProxy);
    }

    async getAssetTokenID(): Promise<string> {
        const abi = await this.mxProxy.getLockedAssetFactoryAbi();
        const response = await this.getGenericData(
            abi,
            scAddress.lockedAssetAddress,
            'getAssetTokenId',
        );
        return response.firstValue.valueOf().toString();
    }

    async getLockedTokenID(): Promise<string> {
        const abi = await this.mxProxy.getLockedAssetFactoryAbi();
        const response = await this.getGenericData(
            abi,
            scAddress.lockedAssetAddress,
            'getLockedAssetTokenId',
        );
        return response.firstValue.valueOf().toString();
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        const abi = await this.mxProxy.getLockedAssetFactoryAbi();
        const response = await this.getGenericData(
            abi,
            scAddress.lockedAssetAddress,
            'getDefaultUnlockPeriod',
        );
        return response.firstValue
            .valueOf()
            .unlock_milestones.map((unlockMilestone) => {
                return new UnlockMileStoneModel({
                    epochs: unlockMilestone.unlock_epoch.toNumber(),
                    percent: unlockMilestone.unlock_percent.toNumber(),
                });
            });
    }

    async getInitEpoch(): Promise<number> {
        const abi = await this.mxProxy.getLockedAssetFactoryAbi();
        const response = await this.getGenericData(
            abi,
            scAddress.lockedAssetAddress,
            'getInitEpoch',
        );
        return response.firstValue.valueOf().toNumber();
    }

    async getExtendedAttributesActivationNonce(): Promise<number> {
        const abi = await this.mxProxy.getLockedAssetFactoryAbi();
        const response = await this.getGenericData(
            abi,
            scAddress.lockedAssetAddress,
            'getExtendedAttributesActivationNonce',
        );
        return response.firstValue.valueOf().toNumber();
    }
}
