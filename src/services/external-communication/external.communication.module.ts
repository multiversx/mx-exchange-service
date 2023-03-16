import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from '../caching/cache.module';
import { CMCApiGetterService } from './api.cmc.getter.service';
import { CMCApiService } from './api.cmc.service';
import { CMCApiSetterService } from './api.cmc.setter.service';

@Module({
    imports: [CommonAppModule, CachingModule],
    providers: [CMCApiService, CMCApiGetterService, CMCApiSetterService],
    exports: [CMCApiService, CMCApiGetterService, CMCApiSetterService],
})
export class ExternalCommunication {}
