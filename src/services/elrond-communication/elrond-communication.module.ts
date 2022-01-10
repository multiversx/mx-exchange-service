import { Module } from '@nestjs/common';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ElrondApiService } from './elrond-api.service';
import { ElrondGatewayService } from './elrond-gateway.service';
import { ElrondProxyService } from './elrond-proxy.service';

@Module({
    providers: [
        ElrondProxyService,
        ElrondApiService,
        ElrondGatewayService,
        ApiConfigService,
    ],
    exports: [ElrondProxyService, ElrondApiService, ElrondGatewayService],
})
export class ElrondCommunicationModule {}
