import { Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmModule } from '../farm/farm.module';
import { AbiProxyService } from './proxy-abi.service';
import { ProxyFarmModule } from './proxy-farm/proxy-farm.module';
import { ProxyPairModule } from './proxy-pair/proxy-pair.module';
import { ProxyResolver } from './proxy.resolver';
import { ProxyService } from './proxy.service';
import { TokenMergingModule } from '../token-merging/token.merging.module';
import { RedisCacheService } from 'src/services/redis-cache.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        ContextModule,
        ProxyPairModule,
        ProxyFarmModule,
        FarmModule,
        TokenMergingModule,
    ],
    providers: [
        AbiProxyService,
        ProxyService,
        RedisCacheService,
        ProxyResolver,
    ],
    exports: [ProxyService, ProxyResolver],
})
export class ProxyModule {}
