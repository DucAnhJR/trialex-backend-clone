import { NumberField, StringField } from '@/decorators/field.decorators';
import { Expose } from 'class-transformer';

export class RefreshResDto {
  @StringField()
  @Expose()
  accessToken!: string;

  @StringField()
  @Expose()
  refreshToken!: string;

  @NumberField()
  @Expose()
  tokenExpires!: number;
}
