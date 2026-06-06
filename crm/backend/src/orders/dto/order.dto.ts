import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  AccessMethod,
  CleaningType,
  FunnelStage,
  LeadSource,
} from '@prisma/client';

export class CreateOrderDto {
  @IsString() clientId: string;
  @IsOptional() @IsEnum(CleaningType) cleaningType?: CleaningType;
  @IsOptional() @IsInt() @Min(0) area?: number;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsInt() @Min(0) estimatedPrice?: number;
  @IsOptional() @IsEnum(LeadSource) source?: LeadSource;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsString() managerId?: string;
}

export class UpdateOrderDto {
  @IsOptional() @IsEnum(CleaningType) cleaningType?: CleaningType;
  @IsOptional() @IsInt() @Min(0) area?: number;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsInt() @Min(0) estimatedPrice?: number;
  @IsOptional() @IsInt() @Min(0) finalPrice?: number;
  @IsOptional() @IsString() inspectionDate?: string;
  @IsOptional() @IsString() scheduledDate?: string;
  @IsOptional() @IsString() comment?: string;
  @IsOptional() @IsEnum(AccessMethod) accessMethod?: AccessMethod;
  @IsOptional() @IsBoolean() hasUtilities?: boolean;
  @IsOptional() @IsString() managerId?: string;
}

export class ChangeStageDto {
  @IsEnum(FunnelStage) stage: FunnelStage;
  @IsOptional() @IsString() rejectionReason?: string;
  @IsOptional() @IsString() scheduledDate?: string;
}

export class AssignCleanersDto {
  @IsArray() @IsString({ each: true }) cleanerIds: string[];
}
