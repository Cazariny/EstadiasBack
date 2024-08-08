import { Controller, Get, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ScrapStationsService } from 'src/scrap/scrap-stations.service';
import { StationsService } from './stations.service';


@Controller('stations')
export class StationsController {
  constructor(
    private readonly stationsService: StationsService,
    private readonly scrapService: ScrapStationsService
  ) {}

  @Get('save')
  async saveStations() {
    return await this.stationsService.getStations();
  }

  @Get('scrap/data')
  async getData() {
    await this.scrapService.getScrapDataStation();
  }

  @Get('map')
  async getStations(@Res() res) {
    const list = await this.stationsService.getMapStations();
    return res.status(HttpStatus.OK).json(list);
  }

  @Get('map/scrap')
  async getScrapStations(@Res() res) {
    const list = await this.scrapService.getMapStations();
    return res.status(HttpStatus.OK).json(list);
  }

  @Get('map/:id')
  async getDataStationId(@Res() res, @Param('id') station_id_uuid: string) {
    const list = await this.stationsService.getDataByStationId(station_id_uuid);
    return res.status(HttpStatus.OK).json(list);
  }

  @Get('map/scrap/:id')
  async getScrapDataStationId(@Res() res, @Param('id') station_id_uuid: string) {
    const list = await this.scrapService.getLastScrapTemperature(station_id_uuid);
    return res.status(HttpStatus.OK).json(list);
  }

  @Get('download')
  async downloadCSV(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('stationId') stationId: string,
    @Res() res: Response,
  ) {
    if (!startDate || !endDate || !stationId) {
      return res.status(400).send('Missing required query parameters');
    }

    const { data, stationName } =
      await this.stationsService.getInfoBetweenDates(
        startDate,
        endDate,
        stationId,
      );
      console.log(data)

    const formattedStartDate = this.formatDate(startDate);
    const formattedEndDate = this.formatDate(endDate);

    const fileName = `${stationName}-${formattedStartDate}-${formattedEndDate}-data.csv`;
    const filePath = path.join(__dirname, '..', '..', 'downloads', fileName);

    await this.stationsService.exportToCSV(data, filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error downloading the file:', err);
        return res.status(500).send('Could not download the file');
      }
      fs.unlinkSync(filePath); // Delete the file after download
    });
  }


  @Get('scrap/download')
  async downloadScrapCSV(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('stationId') stationId: string,
    @Res() res: Response,
  ) {
    if (!startDate || !endDate || !stationId) {
      return res.status(400).send('Missing required query parameters');
    }

    const { data, stationName } =
      await this.scrapService.getScrapInfoBetweenDates(
        startDate,
        endDate,
        stationId,
      );
      // console.log(data)

    const formattedStartDate = this.formatDate(startDate);
    const formattedEndDate = this.formatDate(endDate);

    const fileName = `${stationName}-${formattedStartDate}-${formattedEndDate}-data.csv`;
    const filePath = path.join(__dirname, '..', '..', 'downloads', fileName);

    await this.scrapService.exportScrapToCSV(data, filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Error downloading the file:', err);
        return res.status(500).send('Could not download the file');
      }
      fs.unlinkSync(filePath); // Delete the file after download
    });
  }

  private formatDate(date: string): string {
    const [month, day, year] = date.split('/');
    return `${year}-${month}-${day}`;
  }

  @Post('load')
  async loadStations() {
    await this.scrapService.loadStationsFromFile('stations.json');
    return { message: 'Stations loaded successfully' };
  }

}
