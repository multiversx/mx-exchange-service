import { Injectable } from '@nestjs/common';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { cacheConfig } from '../../config';

const Keys = {
    wrappedEgldTokenID: () => 'wrappedEgldTokenID',
};

@Injectable()
export class CacheWrapService {
    constructor(private cacheManagerService: CacheManagerService) {}

    async getWrappedEgldTokenID(): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.wrappedEgldTokenID());
    }

    async setWrappedEgldTokenID(
        wrappedEgldTokenID: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.wrappedEgldTokenID(),
            wrappedEgldTokenID,
            cacheConfig.token,
        );
    }
}
