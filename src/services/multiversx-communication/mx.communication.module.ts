import { Module } from '@nestjs/common';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { CachingModule } from '../caching/cache.module';
import { MXApiService } from './mx.api.service';
import { MXDataApiService } from './mx.data.api.service';
import { MXGatewayService } from './mx.gateway.service';
import { MXProxyService } from './mx.proxy.service';

@Module({
    imports: [CachingModule],
    providers: [
        MXProxyService,
        MXApiService,
        MXGatewayService,
        MXDataApiService,
        ApiConfigService,
    ],
    exports: [
        MXProxyService,
        MXApiService,
        MXGatewayService,
        MXDataApiService,
        ApiConfigService,
    ],
})
export class MXCommunicationModule {}
