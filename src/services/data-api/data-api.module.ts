import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { DataApiWriteService } from './data-api.write';

@Module({
    imports: [CommonAppModule],
    providers: [DataApiWriteService],
    exports: [DataApiWriteService],
})
export class DataApiModule { }
