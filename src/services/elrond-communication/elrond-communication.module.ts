import { Module } from '@nestjs/common';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { NativeAuthClientService } from 'src/modules/native-auth/native-auth-client.service';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { RemoteConfigModule } from 'src/modules/remote-config/remote-config.module';
import { CachingModule } from '../caching/cache.module';
import { ElrondApiService } from './elrond-api.service';
import { ElrondGatewayService } from './elrond-gateway.service';
import { ElrondProxyService } from './elrond-proxy.service';

@Module({
    imports: [RemoteConfigModule, CachingModule],
    providers: [
        ApiConfigService,
        ElrondProxyService,
        ElrondApiService,
        ElrondGatewayService,
        RemoteConfigGetterService,
        NativeAuthClientService,
    ],
    exports: [
        ElrondProxyService,
        ElrondApiService,
        ElrondGatewayService,
        NativeAuthClientService,
    ],
})
export class ElrondCommunicationModule {}
