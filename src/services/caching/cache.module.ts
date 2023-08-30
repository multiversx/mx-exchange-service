import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { CommonAppModule } from '../../common.app.module';
import { CachingService } from './cache.service';

@Module({
    imports: [CommonAppModule, CacheModule.register()],
    providers: [CachingService],
    exports: [CachingService],
})
export class CachingModule {}
