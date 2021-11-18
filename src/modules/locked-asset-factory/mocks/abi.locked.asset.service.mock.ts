import { UnlockMileStoneModel } from '../models/locked-asset.model';

export class AbiLockedAssetServiceMock {
    async getLockedTokenID(): Promise<string> {
        return 'LockedMEX-2222';
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
}
