import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { RemoteConfigModule } from 'src/modules/remote-config/remote-config.module';
import { CachingModule } from '../caching/cache.module';
import { AWSTimestreamQueryService } from './aws.timestream.query';
import { AWSTimestreamWriteService } from './aws.timestream.write';

@Module({
    imports: [CommonAppModule, RemoteConfigModule, CachingModule],
    providers: [
        AWSTimestreamWriteService,
        AWSTimestreamQueryService,
        RemoteConfigGetterService,
    ],
    exports: [AWSTimestreamWriteService, AWSTimestreamQueryService],
})
export class AWSModule {}
