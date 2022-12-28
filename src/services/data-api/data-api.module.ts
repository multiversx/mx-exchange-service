import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { DataApiQueryService } from './data-api.query.service';
import { DataApiWriteService } from './data-api.write.service';

@Module({
    imports: [CommonAppModule],
    providers: [DataApiQueryService, DataApiWriteService],
    exports: [DataApiQueryService, DataApiWriteService],
})
export class DataApiModule { }
