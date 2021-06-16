import { Injectable } from '@nestjs/common';
import { ContextService } from '../utils/context.service';
import { CacheLockedAssetService } from 'src/services/cache-manager/cache-locked-asset.service';
import { AbiLockedAssetService } from './abi-locked-asset.service';
import {
    LockedAssetModel,
    UnlockMileStoneModel,
} from '../models/locked-asset.model';
import { scAddress } from 'src/config';
import { NFTTokenModel } from '../models/nftToken.model';

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

    async getLockedToken(): Promise<NFTTokenModel> {
        const lockedTokenID = await this.getLockedTokenID();
        return await this.context.getNFTTokenMetadata(lockedTokenID);
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
