import { forwardRef, Module } from '@nestjs/common';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { TokenService } from './services/token.service';
import { TokensResolver } from './token.resolver';
import { TokenComputeService } from './services/token.compute.service';
import { TokenSetterService } from './services/token.setter.service';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { NftTokenResolver } from './nftToken.resolver';
import { AnalyticsModule } from 'src/services/analytics/analytics.module';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';
import { StateModule } from '../state/state.module';

@Module({
    imports: [
        MXCommunicationModule,
        forwardRef(() => PairModule),
        forwardRef(() => RouterModule),
        AnalyticsModule,
        ElasticSearchModule,
        StateModule,
    ],
    providers: [
        TokenService,
        TokenSetterService,
        TokenComputeService,
        TokensResolver,
        NftTokenResolver,
    ],
    exports: [TokenService, TokenSetterService, TokenComputeService],
})
export class TokenModule {}
