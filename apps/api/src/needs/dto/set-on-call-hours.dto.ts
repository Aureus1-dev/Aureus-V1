import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SetOnCallHoursDto {
  @ApiProperty({
    example: 'Monday-Friday 9am-6pm ET. Outside these hours, urgent messages are held for the next business day.',
    description: 'The real, current on-call rotation, in plain language a member can act on. Must match reality exactly — never a placeholder.',
  })
  @IsString() @MinLength(5)
  hoursDescription: string;
}
