import { BinaryCodec } from '@elrondnetwork/erdjs/out';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { scAddress } from 'src/config';
import { DecodeAttributesArgs } from 'src/modules/proxy/models/proxy.args';
import { Logger } from 'winston';
import { DualYieldTokenAttributesModel } from '../models/dualYieldTokenAttributes.model';
import { StakingProxyModel } from '../models/staking.proxy.model';

@Injectable()
export class StakingProxyService {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    getStakingProxies(): StakingProxyModel[] {
        const stakingProxiesAddress: string[] = scAddress.stakingProxy;
        const stakingProxies: StakingProxyModel[] = [];
        for (const address of stakingProxiesAddress) {
            stakingProxies.push(
                new StakingProxyModel({
                    address,
                }),
            );
        }
        return stakingProxies;
    }

    decodeDualYieldTokenAttributes(
        args: DecodeAttributesArgs,
    ): DualYieldTokenAttributesModel[] {
        return args.batchAttributes.map(arg => {
            const attributesBuffer = Buffer.from(arg.attributes, 'base64');
            const codec = new BinaryCodec();
            const structType = DualYieldTokenAttributesModel.getStructure();
            const [decoded] = codec.decodeNested(attributesBuffer, structType);
            const decodedAttributes = decoded.valueOf();
            const dualYieldTokenAttributes = DualYieldTokenAttributesModel.fromDecodedAttributes(
                decodedAttributes,
            );
            dualYieldTokenAttributes.identifier = arg.identifier;
            dualYieldTokenAttributes.attributes = arg.attributes;

            return dualYieldTokenAttributes;
        });
    }
}
