import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { NativeAuthModule } from 'src/modules/native-auth/native-auth.module';
import { RemoteConfigModule } from 'src/modules/remote-config/remote-config.module';
import { ElrondDataApiQueryService } from './elrond.data-api.query';
import { ElrondDataApiWriteService } from './elrond.data-api.write';

@Module({
    imports: [
        CommonAppModule,
        NativeAuthModule,
        RemoteConfigModule,
    ],
    providers: [ElrondDataApiWriteService, ElrondDataApiQueryService],
    exports: [ElrondDataApiWriteService, ElrondDataApiQueryService],
})
export class ElrondDataApiModule { }
