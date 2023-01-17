import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { AWSTimestreamQueryService } from './aws.timestream.query';
import { AWSTimestreamWriteService } from './aws.timestream.write';

@Module({
    imports: [CommonAppModule],
    providers: [AWSTimestreamWriteService, AWSTimestreamQueryService],
    exports: [AWSTimestreamWriteService, AWSTimestreamQueryService],
})
export class AWSModule {}
