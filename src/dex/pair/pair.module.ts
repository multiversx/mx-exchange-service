import { Module } from '@nestjs/common';
import { PairService } from './pair.service';
import { PairResolver } from './pair.resolver';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';

@Module({
    imports: [CacheManagerModule],
    providers: [PairService, PairResolver],
    exports: [PairService]
})
export class PairModule { }
