import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from '@nestjs/apollo';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { Address } from '@multiversx/sdk-core/out';

@Injectable()
export class StakeAddressValidationPipe implements PipeTransform {
    constructor(private readonly remoteConfig: RemoteConfigGetterService) {}

    async transform(value: string | string[], metadata: ArgumentMetadata) {
        let address: Address;
        const values = Array.isArray(value) ? value : [value];
        const stakingAddresses = await this.remoteConfig.getStakingAddresses();

        for (const entry of values) {
            try {
                address = Address.fromBech32(entry);
            } catch (error) {
                throw new UserInputError('Invalid address');
            }
            if (!stakingAddresses.includes(address.bech32())) {
                throw new UserInputError('Invalid staking address');
            }
        }

        return value;
    }
}
