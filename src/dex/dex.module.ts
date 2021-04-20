import { Module, forwardRef } from '@nestjs/common';
import { DexService } from './dex.service';
import { DexResolver } from './dex.resolver';
import { PairModule } from './pair/pair.module';
import { StakingModule } from './staking/staking.module';
import { CacheManagerModule } from '../services/cache-manager/cache-manager.module';
import { RouterModule } from './router/router.module';


@Module({
  imports: [CacheManagerModule, RouterModule, PairModule, StakingModule],
  providers: [DexService, DexResolver],
  exports: [DexService]
})
export class DexModule { }
