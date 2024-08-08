import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import { Model } from 'mongoose';
import * as path from 'path';

import { ScrapStationsInfo } from './schemas/scrapStationsInfo.schema';
import puppeteer from 'puppeteer';
import { Cron } from '@nestjs/schedule';
import * as fastcsv from 'fast-csv';
import { ScrapStations } from './schemas/scrapStations.schema';

@Injectable()
export class ScrapStationsService {
  constructor(
    @InjectModel(ScrapStations.name)
    private scrapStationsModel: Model<ScrapStations>,
    @InjectModel(ScrapStationsInfo.name)
    private scrapInfoModel: Model<ScrapStationsInfo>,
  ) {}

  async loadStationsFromFile(filename: string): Promise<void> {
    try {
      // Leer el archivo JSON
      const filePath = path.join(__dirname, '..', '..', 'data', filename);
      console.log(filePath);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const stations = JSON.parse(fileContents);

      // Insertar datos en la base de datos
      await this.scrapStationsModel.insertMany(stations);
      console.log('Stations added successfully');
    } catch (error) {
      console.error('Failed to load stations from file:', error);
    }
  }

  async getScrapDataStation(): Promise<void> {
    const stations = await this.scrapStationsModel.find().exec();
    for (const station of stations) {
      await this.scrapeTemperature(station);
    }
  }

  async scrapeTemperature(station: ScrapStations): Promise<void> {
    try {
      // Iniciar el navegador
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      // Navegar a la URL
      const url = `${process.env.SCRP_URL}/${station.station_id_uuid}`;

      await page.goto(url, { waitUntil: 'networkidle2' }); // Espera hasta que la red esté casi inactiva

      // Esperar explícitamente por el elemento que contiene la temperatura
      console.log(url);
      await page.waitForSelector(
        '.station-description .aq-info span:nth-child(2)',
      );

      // Extraer la temperatura
      const temperature = await page.evaluate(() => {
        const span = document.querySelector(
          '.station-description .aq-info span:nth-child(2)',
        );
        return span ? span.textContent.trim().match(/\d+/)[0] : null;
      });

      const numTemp = parseFloat(temperature)

      if (temperature) {
        const weatherData = new this.scrapInfoModel({
          stations: station._id,
          station_id_uuid: station.station_id_uuid,
          temperature: numTemp,
        });
        await weatherData.save();
        console.log(
          `Estcion: ${station.station_id_uuid},  Temperatura agregada, : ${temperature}`,
        );
      } else {
        console.error('Temperature element not found or not readable.');
      }

      // Cerrar el navegador
      await browser.close();
    } catch (error) {
      console.error('Error scraping data with Puppeteer:', error);
    }
  }

  async getMapStations(): Promise<ScrapStations[]> {
    return await this.scrapStationsModel.find().exec();
  }

  public async getScrapInfoBetweenDates(
    startDate: string,
    endDate: string,
    stationId: string,
  ): Promise<{ data: any[]; stationName: string }> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
  
      // Validación de fechas
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Fechas inválidas');
      }
  
      const data = await this.scrapInfoModel
        .aggregate([
          {
            $match: {
              horagGen: {
                $gte: start,
                $lte: end,
              },
              station_id_uuid: stationId,
            },
          },
          {
            $lookup: {
              from: 'scrapstations',
              localField: 'station_id_uuid',
              foreignField: 'station_id_uuid',
              as: 'station_info',
            },
          },
          {
            $unwind: {
              path: '$station_info',
              preserveNullAndEmptyArrays: true, // Preserva los documentos si el lookup no encuentra coincidencias
            },
          },
          {
            $project: {
              horagGen: 1,
              temperature: 1,
              station_name: '$station_info.station_name',
            },
          },
        ])
        .exec();
  
      if (!data || data.length === 0) {
        console.warn('No se encontraron datos para los criterios especificados');
        return { data: [], stationName: 'unknown' };
      }
  
      const stationName = data[0]?.station_name || 'unknown';
      return { data, stationName };
    } catch (error) {
      console.error('Error obteniendo información:', error);
      return { data: [], stationName: 'unknown' }; // Retornar un objeto vacío en caso de error
    }
  }
  


  async exportScrapToCSV(data: any[], filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(filePath);
      ws.on('finish', resolve);
      ws.on('error', reject);

      const headers = [
        { id: 'horagGen', title: 'Fecha y Hora' },
        { id: 'temperature', title: 'Temperatura' },
      ];

      const transformedData = data.map((record) => {
        const transformedRecord = {};
        headers.forEach((header) => {
          let value = record[header.id] || '';
          if (
            ['temperature'].includes(
              header.id,
            ) &&
            typeof value === 'number'
          ) {
            value = convertFtoC(value).toFixed(2);
          }
          transformedRecord[header.title] = value === 0 ? 0 : value || '0';
        });
        return transformedRecord;
      });

      fastcsv
        .write(transformedData, {
          headers: headers.map((header) => header.title),
        })
        .pipe(ws);
    });
  }
  
  async getLastScrapTemperature(station_id_uuid: string) {
    try {
      const lastRecord = await this.scrapInfoModel
        .findOne({ station_id_uuid: station_id_uuid })
        .sort({ horagGen: -1 }) // Ordena por la fecha 'horagGen' en orden descendente
        .exec();
      return lastRecord;
    } catch (error) {
      console.error('Error retrieving last record:', error);
      throw error;
    }
  }

  @Cron('0 */4 * * *') // Run every 5 minutes
  async saveScrapDataStationsCron(): Promise<void> {
    await this.getScrapDataStation();
  }
}
function convertFtoC(value: number) {
  const celsius = ((value - 32) * 5) / 9;
  return celsius;
}
