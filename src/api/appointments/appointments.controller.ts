import { PageOptionsDto } from '@/common/dto/offset-pagination/page-options.dto';
import { ParseObjectIdPipe } from '@/common/pipes/objectid.pipe';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { AppointmentsService } from './appointments.service';
import { AppointmentResDto } from './dto/appointment.res.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiAuth({
    description: 'Create a new appointment',
    summary: 'Create Appointment',
    type: AppointmentResDto,
    statusCode: HttpStatus.CREATED,
  })
  createAppointment(
    @CurrentUser('id') userId: Types.ObjectId,
    @Body() body: CreateAppointmentDto,
  ) {
    return this.appointmentsService.createAppointment(userId, body);
  }

  @Get()
  @ApiAuth({
    description: 'Get all appointments for the current user',
    summary: 'Get User Appointments',
    type: AppointmentResDto,
    isPaginated: true,
  })
  getUserAppointments(@Query() query: PageOptionsDto) {
    return this.appointmentsService.findAll(query);
  }

  @Get(':id')
  @ApiAuth({
    description: 'Get appointment by ID',
    summary: 'Get Appointment',
    type: AppointmentResDto,
  })
  getAppointment(@Param('id', ParseObjectIdPipe) id: string) {
    return this.appointmentsService.getAppointment(
      id as unknown as Types.ObjectId,
    );
  }

  @Patch(':id')
  @ApiAuth({
    description: 'Update appointment by ID',
    summary: 'Update Appointment',
    type: AppointmentResDto,
  })
  updateAppointment(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() body: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(
      id as unknown as Types.ObjectId,
      body,
    );
  }

  @Patch(':id/approve')
  @ApiAuth({
    description: 'Approve appointment by ID',
    summary: 'Approve Appointment',
    type: AppointmentResDto,
  })
  async approveAppointment(@Param('id', ParseObjectIdPipe) id: string) {
    return this.appointmentsService.approve(id as unknown as Types.ObjectId);
  }

  @Patch(':id/decline')
  @ApiAuth({
    description: 'Decline appointment by ID',
    summary: 'Decline Appointment',
    type: AppointmentResDto,
  })
  async declineAppointment(@Param('id', ParseObjectIdPipe) id: string) {
    return this.appointmentsService.decline(id as unknown as Types.ObjectId);
  }

  @Delete(':id')
  @ApiAuth({
    description: 'Delete appointment by ID',
    summary: 'Delete Appointment',
    type: AppointmentResDto,
  })
  deleteAppointment(@Param('id', ParseObjectIdPipe) id: string) {
    return this.appointmentsService.delete(id as unknown as Types.ObjectId);
  }
}
