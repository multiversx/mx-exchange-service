import { Module } from '@nestjs/common';
import { PairService } from './pair.service';
import { PairResolver } from './pair.resolver';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { ContextModule } from '../utils/context.module';

@Module({
    imports: [CacheManagerModule, ContextModule],
    providers: [PairService, PairResolver],
    exports: [PairService]
})
export class PairModule { }
