import { PartialType } from '@nestjs/swagger';
import { CreateBusinessKnowledgeDto } from './create-business-knowledge.dto';

export class UpdateBusinessKnowledgeDto extends PartialType(CreateBusinessKnowledgeDto) {}
