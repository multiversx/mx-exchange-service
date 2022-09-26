import { Resolver } from '@nestjs/graphql';

import { FeesCollectorModel } from "./models/fees-collector.model";
import { FeesCollectorAbiService } from "./services/fees-collector.abi.service";

@Resolver(() => FeesCollectorModel)
export class FeesCollectorResolver {
    constructor(
        private readonly farmGetterService: FeesCollectorAbiService // TODO: replace with getter service
    ) {}
}
