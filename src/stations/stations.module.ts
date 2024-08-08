import { Module } from '@nestjs/common';
import { StationsService } from './stations.service';
import { StationsController } from './stations.controller';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Stations, StationsSchema } from './schemas/stations.schema';
import { StationInfo, StationInfoSchema } from './schemas/stationInfo.schema';
import { ScrapStationsInfo, ScrapStationsInfoSchema } from './schemas/scrapStationsInfo.schema';
import { ScrapStations, ScrapStationsSchema } from './schemas/scrapStations.schema';
import { ScrapStationsService } from './scrap-stations.service';


@Module({
  controllers: [StationsController],
  providers: [StationsService, ScrapStationsService],
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Stations.name, schema: StationsSchema},
      { name: StationInfo.name, schema: StationInfoSchema},
      { name: ScrapStations.name, schema: ScrapStationsSchema},
      { name: ScrapStationsInfo.name, schema: ScrapStationsInfoSchema},
    ])
  ]
})
export class StationsModule {}
