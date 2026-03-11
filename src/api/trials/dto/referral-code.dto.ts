import { StringField } from '@/decorators/field.decorators';
import { Matches } from 'class-validator';

export class UpdateReferralCodeDto {
  @StringField({
    description: 'Referral code (6 digits) associated with the trial',
    example: '220404',
  })
  @Matches(/^\d{6}$/, { message: 'Referral code must be exactly 6 digits' })
  referralCode: string;
}
