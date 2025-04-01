import { SwapRouteModel } from 'src/modules/auto-router/models/auto-route.model';
import { PairModel } from 'src/modules/pair/models/pair.model';

export class RouteAllocation {
    tokenRoute: string[];
    addressRoute: string[];
    inputAmount: string;
    outputAmount: string;
    intermediaryAmounts: string[];
    pricesImpact: string[];
    tokensPriceDeviationPercent: number;
    pairs: PairModel[];

    constructor(init?: Partial<RouteAllocation>) {
        Object.assign(this, init);
    }
}

export class MultiHopRouteModel extends SwapRouteModel {
    routeAllocations: RouteAllocation[];

    constructor(init?: Partial<MultiHopRouteModel>) {
        super(init);
        Object.assign(this, init);
    }
}
