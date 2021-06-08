import { Module } from '@nestjs/common';
import { CacheManagerModule } from '../cache-manager/cache-manager.module';
import { ElrondApiService } from './elrond-api.service';

@Module({
    providers: [ElrondApiService],
    imports: [CacheManagerModule],
    exports: [ElrondApiService],
})
export class ElrondCommunicationModule {}
