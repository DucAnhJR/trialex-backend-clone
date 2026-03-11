import { BaseUserResDto } from '@/api/users/dto/base-user.res.dto';
import {
  ClassField,
  NumberField,
  StringField,
} from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';

export class SignInResDto {
  @StringField({
    description: 'Access Token',
  })
  @Expose()
  accessToken: string;

  @StringField({
    description: 'Refresh Token',
  })
  @Expose()
  refreshToken: string;

  @ClassField(() => BaseUserResDto, { description: 'User Information' })
  @Expose()
  user: BaseUserResDto;

  @NumberField()
  @Expose()
  tokenExpires!: number;

  @StringField({
    description: 'Stream Chat Token',
  })
  @Expose()
  streamToken: string;
}
