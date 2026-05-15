import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsMongoId } from 'class-validator';

export class NoticeBoardActionDto {
  @ApiProperty({
    description: 'Trial ID',
    example: '67b93550f81beed12ab81417',
  })
  @IsMongoId()
  trialId: string;

  @ApiProperty({
    description: 'Notice board item ID',
    example: '67b93550f81beed12ab81418',
  })
  @IsMongoId()
  noticeBoardId: string;
}

export class LikeNoticeBoardDto extends NoticeBoardActionDto {
  @ApiProperty({ description: 'Like or unlike', example: true })
  @IsBoolean()
  like: boolean;
}
