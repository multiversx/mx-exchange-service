import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from '@nestjs/apollo';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { Address } from '@multiversx/sdk-core/out';

@Injectable()
export class StakeAddressValidationPipe implements PipeTransform {
    constructor(private readonly remoteConfig: RemoteConfigGetterService) {}

    async transform(value: string, metadata: ArgumentMetadata) {
        let address: Address;
        try {
            address = Address.fromBech32(value);
        } catch (error) {
            throw new UserInputError('Invalid address');
        }
        const stakingAddresses = await this.remoteConfig.getStakingAddresses();
        if (!stakingAddresses.includes(address.bech32())) {
            throw new UserInputError('Invalid staking address');
        }

        return value;
    }
}
