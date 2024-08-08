import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ScrapStations,
  ScrapStationsSchema,
} from 'src/scrap/schemas/scrapStations.schema';
import {
  ScrapStationsInfo,
  ScrapStationsInfoSchema,
} from 'src/scrap/schemas/scrapStationsInfo.schema';
import { ScrapStationsService } from 'src/scrap/scrap-stations.service';
import { StationInfo, StationInfoSchema } from './schemas/stationInfo.schema';
import { Stations, StationsSchema } from './schemas/stations.schema';
import { StationsController } from './stations.controller';
import { StationsService } from './stations.service';

@Module({
  controllers: [StationsController],
  providers: [StationsService, ScrapStationsService],
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Stations.name, schema: StationsSchema },
      { name: StationInfo.name, schema: StationInfoSchema },
      { name: ScrapStations.name, schema: ScrapStationsSchema },
      { name: ScrapStationsInfo.name, schema: ScrapStationsInfoSchema },
    ]),
  ],
})
export class StationsModule {}
