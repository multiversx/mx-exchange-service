import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { NativeAuthClientService } from './native-auth-client.service';

@Module({
    imports: [CommonAppModule],
    providers: [NativeAuthClientService, ApiConfigService],
    exports: [NativeAuthClientService],
})
export class NativeAuthModule {}
