import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';

@Module({
    imports: [CommonAppModule],
    providers: [],
})
export class EscrowModule {}
