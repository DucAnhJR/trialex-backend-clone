import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class PersonalIdUploadDto {
  @ApiProperty({
    description: 'Type of ID document',
    example: 'passport',
  })
  @IsString()
  @IsNotEmpty()
  idType: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Country that issued the ID',
    example: 'Vietnam',
  })
  @IsString()
  @IsNotEmpty()
  countryIssue: string;
}
