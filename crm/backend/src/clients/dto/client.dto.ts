import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ClientTag, LeadSource } from '@prisma/client';

export class CreateClientDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsString()
  @MinLength(5)
  phone: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(ClientTag, { each: true })
  tags?: ClientTag[];

  @IsOptional()
  @IsString()
  managerId?: string;
}

export class UpdateClientDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsEnum(LeadSource) source?: LeadSource;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsEnum(ClientTag, { each: true }) tags?: ClientTag[];
  @IsOptional() @IsString() managerId?: string;
}
