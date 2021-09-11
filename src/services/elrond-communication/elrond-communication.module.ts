import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from '../caching/cache.module';
import { ElrondApiService } from './elrond-api.service';
import { ElrondProxyService } from './elrond-proxy.service';
import { ElrondExtrasApiService } from './elrond.extras.api.service';

@Module({
    imports: [CommonAppModule, CachingModule],
    providers: [ElrondProxyService, ElrondApiService, ElrondExtrasApiService],
    exports: [ElrondProxyService, ElrondApiService, ElrondExtrasApiService],
})
export class ElrondCommunicationModule {}
