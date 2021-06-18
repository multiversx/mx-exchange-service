import { Module } from '@nestjs/common';
import { CacheManagerModule } from '../cache-manager/cache-manager.module';
import { ElrondApiService } from './elrond-api.service';
import { ElrondProxyService } from './elrond-proxy.service';

@Module({
    providers: [ElrondProxyService, ElrondApiService],
    imports: [CacheManagerModule],
    exports: [ElrondProxyService, ElrondApiService],
})
export class ElrondCommunicationModule {}
