import { Module, forwardRef } from '@nestjs/common';
import { RouterService } from './router.service';
import { RouterResolver } from './router.resolver';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';

@Module({
    imports: [CacheManagerModule],
    providers: [RouterService, RouterResolver],
    exports: [RouterService]
})
export class RouterModule { }
