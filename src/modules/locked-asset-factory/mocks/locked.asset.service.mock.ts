import { LockedAssetService } from '../services/locked-asset.service';

export class LockedAssetServiceMock {
    async getLockedTokenID(): Promise<string> {
        return 'LKTOK-1234';
    }
}

export const LockedAssetServiceProvider = {
    provide: LockedAssetService,
    useClass: LockedAssetServiceMock,
};
