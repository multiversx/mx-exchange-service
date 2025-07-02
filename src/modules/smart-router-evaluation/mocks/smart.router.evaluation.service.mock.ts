import { Injectable } from '@nestjs/common';
import { AutoRouteModel } from 'src/modules/auto-router/models/auto-route.model';
import { SmartRouterEvaluationService } from '../services/smart.router.evaluation.service';

@Injectable()
export class SmartRouterEvaluationServiceMock {
    async addFixedInputSwapComparison(
        autoRouteModel: AutoRouteModel,
    ): Promise<void> {
        return;
    }
}

export const SmartRouterEvaluationServiceProvider = {
    provide: SmartRouterEvaluationService,
    useClass: SmartRouterEvaluationServiceMock,
};
