import { Module } from '@nestjs/common';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { NativeAuthModule } from 'src/modules/native-auth/native-auth.module';
import { ElrondApiService } from './elrond-api.service';
import { ElrondDataService } from './elrond-data.service';
import { ElrondGatewayService } from './elrond-gateway.service';
import { ElrondProxyService } from './elrond-proxy.service';

@Module({
    imports: [NativeAuthModule],
    providers: [
        ApiConfigService,
        ElrondProxyService,
        ElrondApiService,
        ElrondGatewayService,
        ElrondDataService,
    ],
    exports: [
        ElrondProxyService,
        ElrondApiService,
        ElrondGatewayService,
        ElrondDataService,
    ],
})
export class ElrondCommunicationModule {}
