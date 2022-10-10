import { Inject, Injectable } from "@nestjs/common";
import { GenericAbiService } from "../../../services/generics/generic.abi.service";
import { ElrondProxyService } from "../../../services/elrond-communication/elrond-proxy.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Interaction, SmartContract, TokenIdentifierValue, U32Value } from "@elrondnetwork/erdjs/out";
import BigNumber from "bignumber.js";

@Injectable()
export class FeesCollectorAbiService extends GenericAbiService {
    static proxy: ElrondProxyService;
    constructor(
        protected readonly elrondProxy: ElrondProxyService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(elrondProxy, logger);
        FeesCollectorAbiService.proxy = elrondProxy;
    }

    static async getContract(scAddress: string): Promise<SmartContract> {
        const contract = await this.proxy.getFeesCollectorContract()
        return contract
    }

    async accumulatedFees(scAddress: string, week: number, token: string): Promise<number> {
        const contract = await FeesCollectorAbiService.getContract(scAddress);
        const interaction: Interaction = contract.methodsExplicit.getAccumulatedFees(
            [
                new U32Value(new BigNumber(week)),
                new TokenIdentifierValue(token)
            ]
        );
        const response = await this.getGenericData(interaction);
        return response.firstValue.valueOf();
    }
}
