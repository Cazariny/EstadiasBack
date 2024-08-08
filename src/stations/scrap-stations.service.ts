import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as fs from 'fs';
import { Model } from 'mongoose';
import * as path from 'path';
import { ScrapStations } from './schemas/scrapStations.schema';
import { ScrapStationsInfo } from './schemas/scrapStationsInfo.schema';
import puppeteer from 'puppeteer';

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
      const url = `${process.env.SCRP_URL}/${station.station_id_uuid}`

      await page.goto(url, { waitUntil: 'networkidle2' }); // Espera hasta que la red esté casi inactiva

      // Esperar explícitamente por el elemento que contiene la temperatura
      console.log(url)
      await page.waitForSelector('.station-description .aq-info span:nth-child(2)');

      // Extraer la temperatura
      const temperature = await page.evaluate(() => {
        const span = document.querySelector(
          '.station-description .aq-info span:nth-child(2)',
        );
        return span ? span.textContent.trim().match(/\d+/)[0] : null;
      });

      if (temperature) {
        const weatherData = new this.scrapInfoModel({
          stations: station._id,
          station_id_uuid: station.station_id_uuid,
          temperature: temperature,
        });
        await weatherData.save();
        console.log(`Estcion: ${station.station_id_uuid},  Temperatura agregada, : ${temperature}`);
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

  //   @Cron('*/5 * * * *') // Run every 5 minutes
  //   async saveScrapDataStationsCron(): Promise<void> {
  //     await this.getScrapDataStation();
  //   }
}
