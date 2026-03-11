import { PartialType } from '@nestjs/swagger';
import { Security } from '../interfaces/security.interface';

export class UpdateSecurityDto extends PartialType(Security) {}
