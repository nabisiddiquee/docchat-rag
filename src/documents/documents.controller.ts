import {
  Body, Controller, Delete, Get, Param, ParseFilePipe, MaxFileSizeValidator, ParseUUIDPipe, Post, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly docs: DocumentsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' }, title: { type: 'string' } },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile(new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: 15 * 1024 * 1024 })] }))
    file: Express.Multer.File,
    @Body('title') title?: string,
  ) {
    return this.docs.ingest(file, title);
  }

  @Get()
  list() {
    return this.docs.list();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.docs.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.docs.remove(id);
  }
}
