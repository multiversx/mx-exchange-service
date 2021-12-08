import { Module } from '@nestjs/common';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { ElrondApiService } from './elrond-api.service';
import { ElrondProxyService } from './elrond-proxy.service';

@Module({
    providers: [ElrondProxyService, ElrondApiService, ApiConfigService],
    exports: [ElrondProxyService, ElrondApiService],
})
export class ElrondCommunicationModule {}
