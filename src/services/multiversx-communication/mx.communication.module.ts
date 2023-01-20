import { Module } from '@nestjs/common';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { MXApiService } from './mx.api.service';
import { MXGatewayService } from './mx.gateway.service';
import { MXProxyService } from './mx.proxy.service';

@Module({
    providers: [
        MXProxyService,
        MXApiService,
        MXGatewayService,
        ApiConfigService,
    ],
    exports: [MXProxyService, MXApiService, MXGatewayService, ApiConfigService],
})
export class MXCommunicationModule {}
