import { Module } from '@nestjs/common';
import { ElrondApiService } from './elrond-api.service';
import { ElrondProxyService } from './elrond-proxy.service';

@Module({
    providers: [ElrondProxyService, ElrondApiService],
    exports: [ElrondProxyService, ElrondApiService],
})
export class ElrondCommunicationModule {}
