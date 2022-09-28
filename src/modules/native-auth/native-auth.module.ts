import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { NativeAuthClientService } from './native-auth-client.service';

@Module({
    imports: [CommonAppModule],
    providers: [NativeAuthClientService],
    exports: [NativeAuthClientService],
})
export class NativeAuthModule {}
