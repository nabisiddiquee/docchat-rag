import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class AskDto {
  @ApiProperty({ example: 'What is the notice period?' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  question!: string;

  @ApiPropertyOptional({ description: 'Limit the search to one document' })
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  topK?: number;
}
