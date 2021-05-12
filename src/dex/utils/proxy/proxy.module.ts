import { Module } from '@nestjs/common';
import { CacheManagerModule } from '../../../services/cache-manager/cache-manager.module';
import { PairModule } from '../../pair/pair.module';
import { ContextModule } from '../context.module';
import { ProxyService } from './proxy.service';
import { ProxyPairService } from './proxy-pair.service';

@Module({
    imports: [CacheManagerModule, ContextModule, PairModule],
    providers: [ProxyService, ProxyPairService],
    exports: [ProxyService, ProxyPairService],
})
export class ProxyModule {}
