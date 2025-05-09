import {
    Controller,
    Get,
    Query,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { SmartRouterEvaluationService } from './services/smart.router.evaluation.service';
import { SwapRoute } from './schemas/swap.route.schema';
import { SwapsEvaluationParams } from './dtos/swaps.evaluation.params';
import { BaseEsdtToken } from '../tokens/models/esdtToken.model';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';

@Controller('smart-router')
export class SmartRouterEvaluationController {
    constructor(
        private readonly smartRouterEvaluationService: SmartRouterEvaluationService,
    ) {}

    @UseGuards(JwtOrNativeAdminGuard)
    @Get('/swaps')
    async getComparisonSwapRoutes(
        @Query(
            new ValidationPipe({
                transform: true,
                transformOptions: { enableImplicitConversion: true },
            }),
        )
        params: SwapsEvaluationParams,
    ): Promise<{ totalCount: number; swaps: SwapRoute[] }> {
        return this.smartRouterEvaluationService.getComparisonSwapRoutes(
            params,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Get('/swaps/tokens')
    async getDistinctTokens(): Promise<{
        tokensIn: string[];
        tokensOut: string[];
        allTokensMetadata: BaseEsdtToken[];
    }> {
        return this.smartRouterEvaluationService.getDistinctTokens();
    }
}
