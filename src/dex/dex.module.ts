import { Module, forwardRef } from '@nestjs/common';
import { DexService } from './dex.service';
import { DexResolver } from './dex.resolver';
import { PairModule } from './pair/pair.module';
import { StakingModule } from './staking/staking.module';
import { CacheManagerModule } from '../services/cache-manager/cache-manager.module';
import { RouterModule } from './router/router.module';
import { ContextModule } from './utils/context.module';


@Module({
  imports: [CacheManagerModule, RouterModule, PairModule, StakingModule, ContextModule],
  providers: [DexService, DexResolver],
  exports: [DexService]
})
export class DexModule { }
