import { Module } from '@nestjs/common';
import { RouterService } from './router.service';
import { RouterResolver } from './router.resolver';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { ContextModule } from '../../services/context/context.module';

@Module({
    imports: [CacheManagerModule, ContextModule],
    providers: [RouterService, RouterResolver],
    exports: [RouterService],
})
export class RouterModule {}
