import { Resolver } from '@nestjs/graphql';
import { EscrowModel } from './models/escrow.model';

@Resolver(EscrowModel)
export class EscrowResolver {}
