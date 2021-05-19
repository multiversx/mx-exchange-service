import { Injectable } from '@nestjs/common';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { cacheConfig } from '../../config';

const Keys = {
    acceptedLockedTokensID: () => 'acceptedLockedTokensID',
};

@Injectable()
export class CacheProxyService {
    constructor(private cacheManagerService: CacheManagerService) {}

    async getAcceptedLockedTokensID(): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.acceptedLockedTokensID());
    }

    async setAcceptedLockedTokensID(
        acceptedLockedTokensID: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.acceptedLockedTokensID(),
            acceptedLockedTokensID,
            cacheConfig.tokens,
        );
    }
}
