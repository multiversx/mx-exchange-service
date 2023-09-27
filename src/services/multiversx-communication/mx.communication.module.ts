import { Module } from '@nestjs/common';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { MXApiService } from './mx.api.service';
import { MXDataApiService } from './mx.data.api.service';
import { MXGatewayService } from './mx.gateway.service';
import { MXProxyService } from './mx.proxy.service';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';

@Module({
    imports: [DynamicModuleUtils.getCacheModule()],
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
