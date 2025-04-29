import { Module } from '@nestjs/common';
import { SmartRouterEvaluationService } from './services/smart.router.evaluation.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SwapRoute, SwapRouteSchema } from './schemas/swap.route.schema';
import { SwapRouteRepositoryService } from 'src/services/database/repositories/swap.route.repository';
import { TokenModule } from '../tokens/token.module';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { SmartRouterEvaluationController } from './smart.router.evaluation.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: SwapRoute.name, schema: SwapRouteSchema },
        ]),
        TokenModule,
    ],
    providers: [
        SmartRouterEvaluationService,
        SwapRouteRepositoryService,
        SmartRouterEvaluationController,
        ApiConfigService,
    ],
    exports: [SmartRouterEvaluationService],
})
export class SmartRouterEvaluationModule {}
