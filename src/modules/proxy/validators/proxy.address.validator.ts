import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from '@nestjs/apollo';
import { Address } from '@multiversx/sdk-core/out';
import { scAddress } from 'src/config';

@Injectable()
export class ProxyAddressValidationPipe implements PipeTransform {
    async transform(value: string, metadata: ArgumentMetadata) {
        let address: Address;
        try {
            address = Address.fromBech32(value);
        } catch (error) {
            throw new UserInputError('Invalid address format');
        }

        const proxAddresses: string[] = Object.values(
            scAddress.proxyDexAddress,
        );
        if (!proxAddresses.includes(address.bech32())) {
            throw new UserInputError('Invalid proxy address');
        }

        return value;
    }
}
