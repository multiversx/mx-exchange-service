import { Injectable } from '@nestjs/common';
import { FlagsGetterService } from './flags.getter.service';
import { AddressesGetterService } from './addresses.getter.service';
import { Mixin } from 'ts-mixer';

@Injectable()
export class RemoteConfigGetterService extends Mixin(FlagsGetterService, AddressesGetterService) {

}
