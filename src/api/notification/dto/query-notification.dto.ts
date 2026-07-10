import { PageOptionsDto } from '@/common/dto/cursor-pagination/page-options.dto';
import { Order } from '@/constants/app.constant';
import {
  BooleanFieldOptional,
  EnumFieldOptional,
  StringFieldOptional,
} from '@/decorators/field.decorators';

export class QueryNotificationDto extends PageOptionsDto {
  @EnumFieldOptional(() => Order, { default: Order.DESC })
  override readonly order?: Order = Order.DESC;

  @StringFieldOptional({ description: 'ID người gửi' })
  senderId?: string;

  @BooleanFieldOptional({ description: 'Trạng thái đã đọc' })
  isRead?: boolean;

  @StringFieldOptional({ description: 'Loại thông báo' })
  type?: string;
}
