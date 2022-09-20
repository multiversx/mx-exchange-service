import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from 'src/services/database/database.module';
import { SCAddressRepositoryService } from '../../services/database/repositories/scAddress.repository';
import { SCAddress, SCAddressSchema } from './schemas/sc-address.schema';
import { FlagRepositoryService } from 'src/services/database/repositories/flag.repository';
import { Flag, FlagSchema } from './schemas/flag.schema';
import { RemoteConfigController } from './remote-config.controller';
import { RemoteConfigGetterService } from './remote-config.getter.service';
import { RemoteConfigSetterService } from './remote-config.setter.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { CachingModule } from 'src/services/caching/cache.module';
import { AnalyticsReindexRepositoryService } from 'src/services/database/repositories/analytics.reindex.state.repository';
import {
    AnalyticsReindexState,
    AnalyticsReindexStateSchema,
} from './schemas/analytics.reindex.state.schema';

@Module({
    imports: [
        DatabaseModule,
        MongooseModule.forFeature([{ name: Flag.name, schema: FlagSchema }]),
        MongooseModule.forFeature([
            { name: SCAddress.name, schema: SCAddressSchema },
        ]),
        MongooseModule.forFeature([
            {
                name: AnalyticsReindexState.name,
                schema: AnalyticsReindexStateSchema,
            },
        ]),
        CachingModule,
    ],
    providers: [
        RemoteConfigController,
        FlagRepositoryService,
        SCAddressRepositoryService,
        AnalyticsReindexRepositoryService,
        RemoteConfigGetterService,
        RemoteConfigSetterService,
        ApiConfigService,
    ],
    exports: [
        RemoteConfigGetterService,
        RemoteConfigSetterService,
        FlagRepositoryService,
        SCAddressRepositoryService,
        AnalyticsReindexRepositoryService,
    ],
})
export class RemoteConfigModule {}
