import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from '@nestjs/apollo';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { Address } from '@multiversx/sdk-core/out';

@Injectable()
export class StakingProxyAddressValidationPipe implements PipeTransform {
    constructor(private readonly remoteConfig: RemoteConfigGetterService) {}

    async transform(value: string[], metadata: ArgumentMetadata) {
        for (const item of value) {
            let address: Address;
            try {
                address = Address.fromBech32(item);
            } catch (error) {
                throw new UserInputError('Invalid address');
            }
            const stakingProxyAddresses =
                await this.remoteConfig.getStakingProxyAddresses();
            if (!stakingProxyAddresses.includes(address.bech32())) {
                throw new UserInputError('Invalid staking proxy address');
            }
        }

        return value;
    }
}
