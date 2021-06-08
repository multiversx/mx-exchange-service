import { Module } from '@nestjs/common';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { FarmModule } from '../farm/farm.module';
import { ContextModule } from '../utils/context.module';
import { AbiProxyService } from './proxy-abi.service';
import { ProxyFarmModule } from './proxy-farm/proxy-farm.module';
import { ProxyPairModule } from './proxy-pair/proxy-pair.module';
import { ProxyResolver } from './proxy.resolver';
import { ProxyService } from './proxy.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        CacheManagerModule,
        ContextModule,
        ProxyPairModule,
        ProxyFarmModule,
        FarmModule,
    ],
    providers: [AbiProxyService, ProxyService, ProxyResolver],
    exports: [ProxyService, ProxyResolver],
})
export class ProxyModule {}
