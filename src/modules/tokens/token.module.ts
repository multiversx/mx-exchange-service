import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { EsdtTokenDbModel, EsdtTokenSchema } from './schemas/token.schema';
import { TokenRepositoryService } from './services/token.repository.service';
import { TokenService } from './services/token.service';
import { AssetsResolver, TokensResolver } from './token.resolver';
import { DatabaseModule } from 'src/services/database/database.module';
import { TokenComputeService } from './services/token.compute.service';
import { TokenSetterService } from './services/token.setter.service';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { NftCollectionResolver } from './nftCollection.resolver';
import { NftTokenResolver } from './nftToken.resolver';
import { AnalyticsModule } from 'src/services/analytics/analytics.module';
import { ElasticService } from 'src/helpers/elastic.service';
import { TokenFilteringService } from './services/token.filtering.service';

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
        AssetsResolver,
        TokensResolver,
        NftCollectionResolver,
        NftTokenResolver,
        ElasticService,
        TokenFilteringService,
    ],
    exports: [
        TokenRepositoryService,
        TokenService,
        TokenSetterService,
        TokenComputeService,
        TokenFilteringService,
    ],
})
export class TokenModule {}
