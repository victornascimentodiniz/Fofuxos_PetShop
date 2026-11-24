
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import {
  AttendanceGroupsController,
  PosAttendanceGroupsController,
} from './attendance-groups.controller';

import { AttendanceGroupsService } from './attendance-groups.service';

@Module({
  imports: [
    AuthModule,
  ],

  controllers: [
    AttendanceGroupsController,
    PosAttendanceGroupsController,
  ],

  providers: [
    AttendanceGroupsService,
  ],
})
export class AttendanceGroupsModule {}
