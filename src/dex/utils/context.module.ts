import { Module } from '@nestjs/common';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { ContextService } from './context.service';

@Module({
    imports: [CacheManagerModule],
    providers: [ContextService],
    exports: [ContextService]
})

export class ContextModule { }
