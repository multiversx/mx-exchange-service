import { Resolver } from '@nestjs/graphql';

import { FeesCollectorModel } from "./models/fees-collector.model";
import { FeesCollectorGetterService } from "./services/fees-collector.getter.service";

@Resolver(() => FeesCollectorModel)
export class FeesCollectorResolver {
    constructor(
        private readonly farmGetterService: FeesCollectorGetterService
    ) {}
}
