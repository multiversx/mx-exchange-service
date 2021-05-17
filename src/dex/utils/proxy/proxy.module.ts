import { Module } from '@nestjs/common';
import { CacheManagerModule } from '../../../services/cache-manager/cache-manager.module';
import { PairModule } from '../../pair/pair.module';
import { ContextModule } from '../context.module';
import { ProxyFarmService } from './proxy-farm.service';
import { ProxyPairService } from './proxy-pair.service';

@Module({
    imports: [CacheManagerModule, ContextModule, PairModule],
    providers: [ProxyFarmService, ProxyPairService],
    exports: [ProxyFarmService, ProxyPairService],
})
export class ProxyModule {}
