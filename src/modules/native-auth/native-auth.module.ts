import { Module } from '@nestjs/common';
import { NativeAuthClientService } from './native-auth-client.service';

@Module({
    imports: [],
    providers: [NativeAuthClientService],
    exports: [NativeAuthClientService],
})
export class NativeAuthModule {}
