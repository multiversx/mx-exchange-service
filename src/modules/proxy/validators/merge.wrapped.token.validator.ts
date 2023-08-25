import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { UserInputError } from '@nestjs/apollo';
import { InputTokenModel } from 'src/models/inputToken.model';
import { ProxyService } from '../services/proxy.service';

@Injectable()
export class MergeWrappedTokenValidationPipe implements PipeTransform {
    constructor(private readonly proxyService: ProxyService) {}

    async transform(value: InputTokenModel[], metadata: ArgumentMetadata) {
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            value[0].tokenID,
        );
        for (const token of value) {
            const address = await this.proxyService.getProxyAddressByToken(
                token.tokenID,
            );
            if (address !== proxyAddress) {
                throw new UserInputError('merge tokens not the same');
            }
        }

        return value;
    }
}
