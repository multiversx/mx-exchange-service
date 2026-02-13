import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { DustConverterService } from './services/dust.converter.service';
import { DustConverterResolver } from './dust.converter.resolver';

@Module({
    imports: [CommonAppModule],
    providers: [DustConverterService, DustConverterResolver],
})
export class DustConverterModule { }
