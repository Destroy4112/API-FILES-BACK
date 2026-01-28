import { Controller, Get, Param, Post, Query, UploadedFile, UseInterceptors, Body, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 200 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('app') app: string,
    @Query('visibility') visibility: 'public' | 'private' = 'private',
    @Query('tenantId') tenantId?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    return this.files.upload({ file, app: app || 'default', visibility, tenantId, ownerId });
  }

  @Get('url/:id')
  async url(@Param('id') id: string) {
    return this.files.getDownloadUrl(id);
  }

  @Get()
  async list(@Query('app') app: string, @Query('tenantId') tenantId?: string) {
    return this.files.list(app || 'default', tenantId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.files.remove(id);
  }
}
