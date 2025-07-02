import { Injectable } from '@nestjs/common';
import { ParallelRouteSwap } from '../models/smart.router.types';
import { SmartRouterService } from '../services/smart.router.service';
import { PairModel } from 'src/modules/pair/models/pair.model';

@Injectable()
export class SmartRouterServiceMock {
    computeBestSwapRoute(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
    ): ParallelRouteSwap {
        return undefined;
    }
}

export const SmartRouterServiceProvider = {
    provide: SmartRouterService,
    useClass: SmartRouterServiceMock,
};
