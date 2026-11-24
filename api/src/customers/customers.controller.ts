import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CustomersService } from './customers.service';
import { CustomerDto, PetDto } from './dto/customers.dto';

@Controller('customers')
@UseGuards(AuthGuard,PermissionsGuard)
export class CustomersController {
  constructor(private readonly service:CustomersService) {}
  @Get() @RequirePermissions('customers.view') list(@Query('search') search?:string,@Query('page') page?:string) {return this.service.list(search,page)}
  @Get(':id') @RequirePermissions('customers.view') get(@Param('id',ParseUUIDPipe) id:string){return this.service.get(id)}
  @Post() @RequirePermissions('customers.create') create(@Body() dto:CustomerDto){return this.service.create(dto)}
  @Patch(':id') @RequirePermissions('customers.update') update(@Param('id',ParseUUIDPipe) id:string,@Body() dto:CustomerDto){return this.service.update(id,dto)}
  @Post(':id/pets') @RequirePermissions('customers.update') addPet(@Param('id',ParseUUIDPipe) id:string,@Body() dto:PetDto){return this.service.createPet(id,dto)}
  @Patch(':id/pets/:petId') @RequirePermissions('customers.update') updatePet(@Param('id',ParseUUIDPipe) id:string,@Param('petId',ParseUUIDPipe) petId:string,@Body() dto:PetDto){return this.service.updatePet(id,petId,dto)}
}
