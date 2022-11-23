import { Module } from '@nestjs/common';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { CachingModule } from '../../services/caching/cache.module';
import {
    LockedTokenWrapperAbiService
} from './services/locked-token-wrapper.abi.service';
import {
    LockedTokenWrapperGetterService
} from './services/locked-token-wrapper.getter.service';
import {
    LockedTokenWrapperService
} from './services/locked-token-wrapper.service';
import { LockedTokenWrapperResolver } from './locked-token-wrapper.resolver';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
    ],
    providers: [
        LockedTokenWrapperAbiService,
        LockedTokenWrapperGetterService,
        LockedTokenWrapperService,
        LockedTokenWrapperResolver
    ],
    exports: [
    ],
})
export class LockedTokenWrapperModule {
}
