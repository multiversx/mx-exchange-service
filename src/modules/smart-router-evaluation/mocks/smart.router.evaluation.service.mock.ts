import { Injectable } from '@nestjs/common';
import { AutoRouteModel } from 'src/modules/auto-router/models/auto-route.model';
import { SmartRouterEvaluationService } from '../services/smart.router.evaluation.service';
import { TransactionModel } from 'src/models/transaction.model';

@Injectable()
export class SmartRouterEvaluationServiceMock {
    async addFixedInputSwapComparison(
        autoRouteModel: AutoRouteModel,
        transaction: TransactionModel,
    ): Promise<void> {
        return;
    }
}

export const SmartRouterEvaluationServiceProvider = {
    provide: SmartRouterEvaluationService,
    useClass: SmartRouterEvaluationServiceMock,
};
