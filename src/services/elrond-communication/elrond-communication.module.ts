import { Module } from '@nestjs/common';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { NativeAuthClientService } from 'src/modules/native-auth/native-auth-client.service';
import { NativeAuthModule } from 'src/modules/native-auth/native-auth.module';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { RemoteConfigModule } from 'src/modules/remote-config/remote-config.module';
import { CachingModule } from '../caching/cache.module';
import { ElrondApiService } from './elrond-api.service';
import { ElrondDataReadService } from './elrond-data.read.service';
import { ElrondDataWriteService } from './elrond-data.write.service';
import { ElrondGatewayService } from './elrond-gateway.service';
import { ElrondProxyService } from './elrond-proxy.service';

@Module({
    imports: [NativeAuthModule, RemoteConfigModule, CachingModule],
    providers: [
        ApiConfigService,
        ElrondProxyService,
        ElrondApiService,
        ElrondGatewayService,
        ElrondDataReadService,
        ElrondDataWriteService,
        RemoteConfigGetterService,
        NativeAuthClientService,
    ],
    exports: [
        ElrondProxyService,
        ElrondApiService,
        ElrondGatewayService,
        ElrondDataReadService,
        ElrondDataWriteService,
        NativeAuthClientService,
    ],
})
export class ElrondCommunicationModule {}
