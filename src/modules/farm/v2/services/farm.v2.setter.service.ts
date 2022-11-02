import { Injectable } from '@nestjs/common';
import { FarmSetterService } from '../../base-module/services/farm.setter.service';

@Injectable()
export class FarmSetterServiceV2 extends FarmSetterService {}
