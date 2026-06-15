import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class BannerResDto {
  @ApiProperty({ example: '68d608f0363eff5322aefb7a' })
  @Expose()
  _id: string;

  @ApiProperty({ example: 'Trial Responsibilities' })
  @Expose()
  title: string;

  @ApiProperty({
    example: 'Volunteer your time to support asthma research.',
  })
  @Expose()
  description: string;

  @ApiProperty({ example: 'bannerSwiper' })
  @Expose()
  image: string;

  @ApiProperty({
    example: 'https://mrctcenter.org/project/post-trial-responsibilities/',
  })
  @Expose()
  link: string;

  @ApiProperty({ example: 'Urgent' })
  @Expose()
  tag: string;
}
