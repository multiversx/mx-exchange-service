import { Module } from '@nestjs/common';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { ContextModule } from '../utils/context.module';
import { ProxyModule } from '../utils/proxy.module';
import { DistributionResolver } from './distribution.resolver';
import { DistributionService } from './distribution.service';

@Module({
    imports: [CacheManagerModule, ContextModule, ProxyModule],
    providers: [DistributionService, DistributionResolver],
    exports: [DistributionService],
})
export class DistributionModule {}
