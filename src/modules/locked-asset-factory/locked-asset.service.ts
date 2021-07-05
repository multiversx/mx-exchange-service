import { Injectable } from '@nestjs/common';
import { CacheLockedAssetService } from 'src/services/cache-manager/cache-locked-asset.service';
import { AbiLockedAssetService } from './abi-locked-asset.service';
import {
    LockedAssetModel,
    UnlockMileStoneModel,
} from '../../models/locked-asset.model';
import { scAddress } from 'src/config';
import { NftToken } from '../../models/tokens/nftToken.model';
import { ContextService } from '../../services/context/context.service';

@Injectable()
export class LockedAssetService {
    constructor(
        private abiService: AbiLockedAssetService,
        private cacheService: CacheLockedAssetService,
        private context: ContextService,
    ) {}

    async getLockedAssetInfo(): Promise<LockedAssetModel> {
        const lockedAssetInfo = new LockedAssetModel();
        lockedAssetInfo.address = scAddress.lockedAssetAddress;
        return lockedAssetInfo;
    }

    async getLockedToken(): Promise<NftToken> {
        const lockedTokenID = await this.getLockedTokenID();
        return await this.context.getNftTokenMetadata(lockedTokenID);
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

    private async getLockedTokenID(): Promise<string> {
        const cachedData = await this.cacheService.getLockedTokenID();
        if (!!cachedData) {
            return cachedData.lockedTokenID;
        }
        const lockedTokenID = await this.abiService.getLockedTokenID();
        this.cacheService.setLockedTokenID({ lockedTokenID: lockedTokenID });
        return lockedTokenID;
    }
}
