import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsMongoId } from 'class-validator';

export class LikePublicationDto {
  @ApiProperty({
    description: 'Publication ID',
    example: '67b93550f81beed12ab81417',
  })
  @IsMongoId()
  publicationId: string;

  @ApiProperty({ description: 'Like or unlike', example: true })
  @IsBoolean()
  like: boolean;
}
