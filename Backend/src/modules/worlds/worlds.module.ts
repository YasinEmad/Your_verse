import { Module } from '@nestjs/common';
import { WorldsService } from './worlds.service';
import { WorldsController } from './worlds.controller';
import { SectionsModule } from './sections/sections.module';

@Module({
	imports: [SectionsModule],
	controllers: [WorldsController],
	providers: [WorldsService],
	exports: [WorldsService],
})
export class WorldsModule {}
