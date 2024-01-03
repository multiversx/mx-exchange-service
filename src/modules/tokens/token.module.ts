import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { EsdtTokenDbModel, EsdtTokenSchema } from './schemas/token.schema';
import { TokenRepositoryService } from './services/token.repository.service';
import { TokenService } from './services/token.service';
import { TokensResolver } from './token.resolver';
import { DatabaseModule } from 'src/services/database/database.module';
import { TokenComputeService } from './services/token.compute.service';
import { TokenSetterService } from './services/token.setter.service';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { NftCollectionResolver } from './nftCollection.resolver';
import { NftTokenResolver } from './nftToken.resolver';
import { AnalyticsModule } from 'src/services/analytics/analytics.module';

@Module({
    imports: [
        MXCommunicationModule,
        forwardRef(() => PairModule),
        forwardRef(() => RouterModule),
        DatabaseModule,
        MongooseModule.forFeature([
            { name: EsdtTokenDbModel.name, schema: EsdtTokenSchema },
        ]),
        AnalyticsModule,
    ],
    providers: [
        TokenService,
        TokenSetterService,
        TokenComputeService,
        TokenRepositoryService,
        TokensResolver,
        NftCollectionResolver,
        NftTokenResolver,
    ],
    exports: [
        TokenRepositoryService,
        TokenService,
        TokenSetterService,
        TokenComputeService,
    ],
})
export class TokenModule {}
