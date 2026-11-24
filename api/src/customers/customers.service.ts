import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerDto, PetDto } from './dto/customers.dto';

const customerFields = ['name','document','phone','whatsapp','email','zipCode','address','number','neighborhood','city','state','notes','active'] as const;
const petFields = ['name','species','breed','sex','birthDate','weightKg','coat','neutered','allergies','careNotes','notes','active'] as const;
function normalize<T extends object>(input: T, fields: readonly string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const field of fields) if (Object.prototype.hasOwnProperty.call(input, field)) {
    const value = (input as Record<string, unknown>)[field];
    obj[field] = typeof value === 'string' ? (value.trim() || null) : value;
  }
  return obj;
}
@Injectable()
export class CustomersService {
  constructor(private readonly db: PrismaService) {}
  private handle(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') throw new ConflictException('Documento já cadastrado para outro cliente.');
      if (e.code === 'P2025') throw new NotFoundException('Registro não encontrado.');
    }
    throw e;
  }
  async list(search = '', pageValue = '1') {
    const page = Number(pageValue);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) throw new BadRequestException('Página inválida.');
    const term = search.trim().slice(0, 100);
    const where: Prisma.CustomerWhereInput = term ? { OR: [
      { name: { contains: term, mode: 'insensitive' } },
      { phone: { contains: term } },
      { document: { contains: term.replace(/\D/g, '') || term } },
      { pets: { some: { name: { contains: term, mode: 'insensitive' } } } },
    ] } : {};
    const [data,total] = await this.db.$transaction([
      this.db.customer.findMany({ where, include: { pets: { orderBy: { name: 'asc' } } }, orderBy: { name: 'asc' }, skip:(page-1)*20,take:20 }),
      this.db.customer.count({where}),
    ]);
    return {data, pagination:{page,total,totalPages:Math.ceil(total/20)}};
  }
  async get(id:string) {
    const c = await this.db.customer.findUnique({ where:{id}, include:{pets:{orderBy:{name:'asc'}}} });
    if (!c) throw new NotFoundException('Cliente não encontrado.');
    return c;
  }
  private customerData(dto:CustomerDto) {
    const data = normalize(dto,customerFields);
    if (typeof data.document === 'string') data.document = data.document.replace(/\D/g,'');
    if (typeof data.email === 'string') data.email = data.email.toLowerCase();
    if (typeof data.name !== 'undefined' && !data.name) throw new BadRequestException('Nome é obrigatório.');
    return data;
  }
  async create(dto:CustomerDto) {
    try { return await this.db.customer.create({data:this.customerData(dto) as Prisma.CustomerCreateInput}); }
    catch(e) {this.handle(e)}
  }
  async update(id:string,dto:CustomerDto) {
    await this.get(id);
    try { return await this.db.customer.update({where:{id},data:this.customerData(dto) as Prisma.CustomerUpdateInput}); }
    catch(e) {this.handle(e)}
  }
  private petData(dto:PetDto) {
    const data = normalize(dto,petFields);
    if (typeof data.birthDate === 'string') {
      const date = new Date(`${data.birthDate.slice(0,10)}T12:00:00Z`);
      if (Number.isNaN(date.getTime())) throw new BadRequestException('Data inválida.');
      data.birthDate = date;
    }
    if (typeof data.weightKg === 'string' && Number(data.weightKg) <= 0) throw new BadRequestException('Peso deve ser positivo.');
    if (data.name === null || data.species === null) throw new BadRequestException('Nome e espécie são obrigatórios.');
    return data;
  }
  async createPet(customerId:string,dto:PetDto) {
    await this.get(customerId);
    return this.db.pet.create({data:{...this.petData(dto),customer:{connect:{id:customerId}}} as Prisma.PetCreateInput});
  }
  async updatePet(customerId:string,petId:string,dto:PetDto) {
    const pet = await this.db.pet.findFirst({where:{id:petId,customerId}});
    if (!pet) throw new NotFoundException('Pet não encontrado para este cliente.');
    return this.db.pet.update({where:{id:petId},data:this.petData(dto) as Prisma.PetUpdateInput});
  }
}
