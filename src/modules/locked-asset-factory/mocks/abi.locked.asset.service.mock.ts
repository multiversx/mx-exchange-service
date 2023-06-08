import { UnlockMileStoneModel } from '../models/locked-asset.model';
import { AbiLockedAssetService } from '../services/abi-locked-asset.service';

export class AbiLockedAssetServiceMock {
    async getLockedTokenID(): Promise<string> {
        return 'LKTOK-1234';
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        return [
            new UnlockMileStoneModel({
                epochs: 1,
                percent: 10,
            }),
            new UnlockMileStoneModel({
                epochs: 31,
                percent: 90,
            }),
        ];
    }

    async getInitEpoch(): Promise<number> {
        return 1;
    }

    async getExtendedAttributesActivationNonce(): Promise<number> {
        return 2;
    }
}

export const AbiLockedAssetServiceProvider = {
    provide: AbiLockedAssetService,
    useClass: AbiLockedAssetServiceMock,
};
