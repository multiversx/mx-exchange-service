import { Inject, Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { RedisPubSub } from "graphql-redis-subscriptions";
import { constantsConfig } from "src/config";
import { AbiLockedAssetService } from "src/modules/locked-asset-factory/services/abi-locked-asset.service";
import { LockedAssetSetterService } from "src/modules/locked-asset-factory/services/locked.asset.setter.service";
import { PUB_SUB } from "../redis.pubSub.module";

@Injectable()
export class ProxyCacheWarmerService {
    private invalidatedKeys = [];

    constructor(
        private readonly abiService: AbiLockedAssetService,
        private readonly lockedAssetSetter: LockedAssetSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}
 
    @Cron(CronExpression.EVERY_MINUTE)
    async cacheLockedAssetsInfo(): Promise<void> {
        const burnedToken = await this.abiService.getBurnedTokenAmount(constantsConfig.MEX_TOKEN_ID);
        this.invalidatedKeys = await Promise.all([
            this.lockedAssetSetter.setBurnedTokenAmount(constantsConfig.MEX_TOKEN_ID, burnedToken)
        ]);
        await this.deleteCacheKeys();
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
}
