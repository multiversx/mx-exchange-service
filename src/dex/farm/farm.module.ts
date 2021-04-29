import { Module } from '@nestjs/common';
import { FarmService } from './farm.service';
import { FarmResolver } from './farm.resolver';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { ContextModule } from '../utils/context.module';

@Module({
    imports: [CacheManagerModule, ContextModule],
    providers: [FarmService, FarmResolver],
    exports: [FarmService],
})
export class FarmModule {}
