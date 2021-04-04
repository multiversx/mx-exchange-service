import { Module, forwardRef } from '@nestjs/common';
import { DexService } from './dex.service';
import { DexResolver, PairResolver } from './dex.resolver';
import { CacheManagerModule } from '../services/cache-manager/cache-manager.module';

@Module({
  imports: [CacheManagerModule],
  providers: [DexService, DexResolver, PairResolver],
  exports: [DexService]
})
export class DexModule { }
