import {
  ClassField,
  DateField,
  NumberField,
  StringField,
} from '@/decorators/field.decorators';
import { Prop } from '@nestjs/mongoose';
import { Expose, Type } from 'class-transformer';

export class NoticeBoardLike {
  @StringField({
    description: 'User ID',
    example: '69e8abe8f2149682648b5d12',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  userId: string;
}

export class NoticeBoardItem {
  @StringField({
    description: 'Notice board item ID',
    example: '67b93550f81beed12ab81418',
    nullable: true,
  })
  @Expose()
  _id: string;

  @StringField({
    description: 'Notice title',
    example: 'ACL-STARR Update',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  title: string;

  @DateField({
    description: 'Notice creation date',
    example: '2026-05-14T00:00:00.000Z',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  createAt: Date;

  @StringField({
    description: 'Notice content',
    example:
      'Dear Participants,\nWe hope this message finds you well. Please be informed that the survey date for our upcoming clinical trial has been rescheduled.',
    nullable: true,
  })
  @Expose()
  @Prop({ default: null })
  content: string;

  @NumberField({
    description: 'Like count',
    example: 1,
    nullable: true,
  })
  @Expose()
  @Prop({ default: 0 })
  like_count: number;

  @ClassField(() => NoticeBoardLike, { isArray: true })
  @Type(() => NoticeBoardLike)
  @Expose()
  @Prop({ type: [NoticeBoardLike], default: [] })
  likes: NoticeBoardLike[];

  @ClassField(() => NoticeBoardLike, { isArray: true })
  @Type(() => NoticeBoardLike)
  @Expose()
  @Prop({ type: [NoticeBoardLike], default: [] })
  mark_reads: NoticeBoardLike[];

  @NumberField({
    description: 'Attached document count',
    example: 6,
    nullable: true,
  })
  @Expose()
  @Prop({ default: 0 })
  document_attached: number;
}
