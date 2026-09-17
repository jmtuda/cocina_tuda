import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { ImportService } from '../application/import.service.js';
import type { ImportSource } from '../domain/import-proposal.js';
import {
  ConfirmImportDto,
  CreateImportProposalDto,
  ImportProposalResponseDto,
} from './import.dto.js';
import { RecipeResponseDto } from '../../library/presentation/recipe-response.dto.js';

@ApiTags('imports')
@Controller('imports')
export class ImportController {
  constructor(private readonly imports: ImportService) {}

  @Post('proposals')
  @ApiCreatedResponse({ type: ImportProposalResponseDto })
  propose(@Body() body: CreateImportProposalDto) {
    const source: ImportSource =
      body.source.kind === 'text'
        ? { kind: 'text', text: body.source.text ?? '' }
        : {
            kind: 'file',
            filename: body.source.filename ?? '',
            mimeType: body.source.mimeType ?? '',
            dataBase64: body.source.dataBase64 ?? '',
          };
    return this.imports.propose(source, body.consent);
  }

  @Post('confirmations')
  @ApiOkResponse({ type: RecipeResponseDto })
  confirm(@Body() body: ConfirmImportDto) {
    return this.imports.confirm(body);
  }
}
