import { PartialType } from '@nestjs/swagger';
import { Information } from '../interfaces/information.interface';

export class UpdatePersonalInfoDto extends PartialType(Information) {}
