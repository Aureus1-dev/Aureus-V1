import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

/**
 * All fields optional — inherits validation from CreateUserDto.
 * Uses PartialType to preserve Swagger metadata on every field.
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
