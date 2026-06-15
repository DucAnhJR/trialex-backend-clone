import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class SupportQuestionResDto {
  @ApiProperty({ example: 'What is the purpose of this app?' })
  @Expose()
  title: string;

  @ApiProperty({ example: 'This app helps users find clinical trials.' })
  @Expose()
  answer: string;
}

export class SupportFaqResDto {
  @ApiProperty({ example: '68d608f0363eff5322aefb7a' })
  @Expose()
  _id: string;

  @ApiProperty({ example: 'Common Issues' })
  @Expose()
  thread_title: string;

  @ApiProperty({ type: [SupportQuestionResDto] })
  @Expose()
  @Type(() => SupportQuestionResDto)
  questions: SupportQuestionResDto[];
}
