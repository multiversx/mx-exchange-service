import { Injectable } from '@nestjs/common';
import { AnalyticsWriteInterface } from '../interfaces/analytics.write.interface';

@Injectable()
export class AnalyticsWriteService  implements AnalyticsWriteInterface{
}
