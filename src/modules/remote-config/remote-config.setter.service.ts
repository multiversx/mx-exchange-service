import { Injectable } from '@nestjs/common';
import { FlagsSetterService } from './flags.setter.service';
import { AddressesSetterService } from './addresses.setter.service';
import { Mixin } from 'ts-mixer';

@Injectable()
export class RemoteConfigSetterService extends Mixin(FlagsSetterService, AddressesSetterService) {
}
