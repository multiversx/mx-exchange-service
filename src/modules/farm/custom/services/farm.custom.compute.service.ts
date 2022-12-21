import { Injectable } from '@nestjs/common';
import { FarmComputeService } from '../../base-module/services/farm.compute.service';

@Injectable()
export class FarmCustomComputeService extends FarmComputeService {}
