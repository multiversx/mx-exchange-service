import { Module } from '@nestjs/common';
import { RouterService } from './router.service';
import { RouterResolver } from './router.resolver';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';

@Module({
    imports: [ElrondCommunicationModule, CacheManagerModule, ContextModule],
    providers: [RouterService, RouterResolver],
    exports: [RouterService],
})
export class RouterModule {}
