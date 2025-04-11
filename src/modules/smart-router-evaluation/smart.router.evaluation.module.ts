import { Module } from '@nestjs/common';
import { SmartRouterEvaluationService } from './services/smart.router.evaluation.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SwapRoute, SwapRouteSchema } from './schemas/swap.route.schema';
import { SwapRouteRepositoryService } from 'src/services/database/repositories/swap.route.repository';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: SwapRoute.name, schema: SwapRouteSchema },
        ]),
    ],
    providers: [SmartRouterEvaluationService, SwapRouteRepositoryService],
    exports: [SmartRouterEvaluationService],
})
export class SmartRouterEvaluationModule {}
