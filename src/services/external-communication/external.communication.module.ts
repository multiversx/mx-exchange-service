import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from '../caching/cache.module';
import { CMCApiGetterService } from './api.cmc.getter.service';
import { CMCApiService } from './api.cmc.service';

@Module({
    imports: [CommonAppModule, CachingModule],
    providers: [CMCApiService, CMCApiGetterService],
    exports: [CMCApiGetterService],
})
export class ExternalCommunication {}
