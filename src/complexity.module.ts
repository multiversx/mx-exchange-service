import { Module } from '@nestjs/common';
import { ComplexityPlugin } from './utils/complexity.plugin';
import { ApiConfigService } from './helpers/api.config.service';

@Module({
    providers: [ApiConfigService, ComplexityPlugin],
})
export class ComplexityModule {}
