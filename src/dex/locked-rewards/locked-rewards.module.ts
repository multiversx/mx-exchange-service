import { Module } from '@nestjs/common';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { ContextModule } from '../utils/context.module';
import { ProxyModule } from '../utils/proxy/proxy.module';
import { LockedRewardsResolver } from './locked-rewards.resolver';
import { LockedRewardsService } from './locked-rewards.service';

@Module({
    imports: [CacheManagerModule, ContextModule, ProxyModule],
    providers: [LockedRewardsService, LockedRewardsResolver],
    exports: [LockedRewardsService],
})
export class LockedRewardsModule {}
