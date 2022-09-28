import { Inject, Injectable } from "@nestjs/common";
import { GenericAbiService } from "../../../services/generics/generic.abi.service";
import { ElrondProxyService } from "../../../services/elrond-communication/elrond-proxy.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { ElrondGatewayService } from "../../../services/elrond-communication/elrond-gateway.service";
import { SmartContract } from "@elrondnetwork/erdjs/out";
import {
    WeeklyRewardsSplittingAbiService
} from "../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service";
import { Mixin } from "ts-mixer";
import { abiConfig } from "../../../config";

@Injectable()
export class FeesCollectorAbiService extends Mixin(GenericAbiService, WeeklyRewardsSplittingAbiService) {
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly gatewayService: ElrondGatewayService,
    ) {
        super(elrondProxy, logger);
    }

    async getContract(address: string): Promise<[SmartContract, string]> {
        return [await this.elrondProxy.getFeesCollectorContract(), ""]
    }

    outdatedVersion(_version: string): boolean {
        return false;
    }
}
