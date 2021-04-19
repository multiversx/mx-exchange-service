import { Module } from '@nestjs/common';
import { StakingService } from './staking.service';
import { StakingResolver } from './staking.resolver';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { ContextModule } from '../utils/context.module';

@Module({
    imports: [CacheManagerModule, ContextModule],
    providers: [StakingService, StakingResolver],
    exports: [StakingService]
})
export class RouterModule { }
