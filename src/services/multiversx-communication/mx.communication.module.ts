import { Module } from '@nestjs/common';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { MXApiService } from './mx.api.service';
import { MXDataApiService } from './mx.data.api.service';
import { MXGatewayService } from './mx.gateway.service';
import { MXProxyService } from './mx.proxy.service';
import { XPortalApiService } from './mx.xportal.api.service';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';

@Module({
    imports: [
        DynamicModuleUtils.getCacheModule(),
        DynamicModuleUtils.getApiModule(),
    ],
    providers: [
        MXProxyService,
        MXApiService,
        MXGatewayService,
        MXDataApiService,
        XPortalApiService,
        ApiConfigService,
    ],
    exports: [
        MXProxyService,
        MXApiService,
        MXGatewayService,
        MXDataApiService,
        XPortalApiService,
        ApiConfigService,
    ],
})
export class MXCommunicationModule {}
