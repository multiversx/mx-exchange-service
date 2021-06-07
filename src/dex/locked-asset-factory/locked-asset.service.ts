import { Injectable } from '@nestjs/common';
import { ContextService } from '../utils/context.service';
import { TokenModel } from '../models/pair.model';
import { CacheLockedAssetService } from 'src/services/cache-manager/cache-locked-asset.service';
import { AbiLockedAssetService } from './abi-locked-asset.service';
import { LockedAssetModel } from '../models/locked-asset.model';
import { scAddress } from 'src/config';

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

    async getLockedToken(): Promise<TokenModel> {
        const lockedTokenID = await this.getLockedTokenID();
        return await this.context.getNFTTokenMetadata(lockedTokenID);
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
