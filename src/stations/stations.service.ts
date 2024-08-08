import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import * as fastcsv from 'fast-csv';
import * as fs from 'fs';
import { Model } from 'mongoose';
import { lastValueFrom } from 'rxjs';
import { StationInfo } from './schemas/stationInfo.schema';
import { Stations } from './schemas/stations.schema';

@Injectable()
export class StationsService {
  private readonly apiUrlStations: string;
  private readonly apiUrlData: string;
  private readonly headers: Record<string, string>;

  constructor(
    @InjectModel(Stations.name) private stationsModel: Model<Stations>,
    @InjectModel(StationInfo.name) private infoModel: Model<StationInfo>,
    private readonly http: HttpService,
  ) {
    this.apiUrlStations = `${process.env.BASE_URL_STATIONS}api-key=${process.env.API_KEY}`;
    this.apiUrlData = `${process.env.BASE_URL_DATA}`;
    this.headers = {
      'X-Api-Secret': process.env.API_SECRET,
    };
  }

  private formatTimestamp(timestamp: string | number): string | null {
    const date = new Date(Number(timestamp) * 1000); // Convertir segundos a milisegundos
    if (isNaN(date.getTime())) {
      return null; // Devuelve null si el timestamp no es válido
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}:${month}:${year} ${hours}:${minutes}`;
  }

  // Obtiene la lista de todas las estaciones que tenga la API
  async getStations(): Promise<void> {
    try {
      const data = await this.fetchData(this.apiUrlStations);
      for (const item of data.stations) {
        await this.saveStation(item);
      }
    } catch (error) {
      console.log('Error obteniendo o guardando Estacion:', error.message);
    }
  }

  // Obtiene la Informacion de la API
  private async fetchData(url: string): Promise<any> {
    const apiResponse = await lastValueFrom(
      this.http.get(url, { headers: this.headers }),
    );
    return apiResponse.data;
  }

  // Guarda la estacion
  private async saveStation(stationData: any): Promise<void> {
    const existingStation = await this.stationsModel.findOne({
      station_id: stationData.station_id,
    });

    if (!existingStation) {
      const newData = new this.stationsModel(stationData);
      await newData.save();
      console.log(`Estacion guardada: ${stationData.station_id}`);
    } else {
      console.log(`Estacion ${stationData.station_id} Ya existe, saltando.`);
    }
  }

  // Obtiene la Informacion que tiene una estacion
  async getDataStation(): Promise<void> {
    const stations = await this.stationsModel.find().exec();
    for (const station of stations) {
      await this.saveStationData(station);
    }
  }

  // Guarda la informacion de la estacion
  private async saveStationData(station: Stations): Promise<void> {
    try {
      const url = `${this.apiUrlData}${station.station_id_uuid}?api-key=${process.env.API_KEY}`;
      const data = await this.fetchData(url);

      const sensors = data.sensors.map((sensor) => ({
        ...sensor,
        data: sensor.data.map((dataItem) => ({ ...dataItem })),
      }));

      const newStationInfo = new this.infoModel({
        ...data,
        sensors,
        station_id: station.station_id,
        stations: station._id,
      });

      console.log(
        `Informacion de la estacion: ${newStationInfo.station_id} Obtenida`,
      );
      await newStationInfo.save();
    } catch (error) {
      console.log('Error obteniendo o guardando Datos:', error.message);
    }
  }

  private transformData(dataPoint: any): any {
    const transformedData = { ...dataPoint };
    if (transformedData.ts) {
      const formattedTimestamp = this.formatTimestamp(transformedData.ts);
      transformedData.ts = formattedTimestamp
        ? formattedTimestamp
        : 'Invalid timestamp';
    } else {
      transformedData.ts = 'No timestamp';
    }
    if (transformedData.rain_storm_start_date) {
      const formattedStormDate = this.formatTimestamp(
        transformedData.rain_storm_start_date,
      );
      transformedData.rain_storm_start_date =
        formattedStormDate || 'Invalid timestamp';
    } else {
      transformedData.rain_storm_start_date = 'No timestamp';
    }
    return transformedData;
  }

  public async getInfoBetweenDates(
    startDate: string,
    endDate: string,
    stationId: string,
  ): Promise<{ data: any[]; stationName: string }> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const data = await this.infoModel
      .aggregate([
        {
          $match: {
            horagGen: {
              $gte: start,
              $lte: end,
            },
            'sensors.sensor_type': 23,
            station_id_uuid: stationId,
          },
        },
        {
          $lookup: {
            from: 'stations', // Nombre de la colección de estaciones
            localField: 'station_id_uuid',
            foreignField: 'station_id_uuid',
            as: 'station_info',
          },
        },
        {
          $unwind: '$station_info', // Desglosa el array para simplificar el acceso
        },
        {
          $project: {
            horagGen: 1,
            sensors: 1,
            station_name: '$station_info.station_name',
          },
        },
      ])
      .exec();

    const processedData = this.processData(data);
    const stationName = data[0]?.station_name || 'unknown';

    return { data: processedData, stationName };
  }

  private filterSensors(record: any): any[] {
    return record.sensors.filter((sensor) => sensor.sensor_type === 23);
  }

  private processData(data: any[]): any[] {
    return data
      .map((record) => {
        return this.filterSensors(record)
          .map((sensor) => sensor.data.map(this.transformData.bind(this)))
          .flat();
      })
      .flat();
  }

  async exportToCSV(data: any[], filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(filePath);
      ws.on('finish', resolve);
      ws.on('error', reject);

      const headers = [
        { id: 'ts', title: 'Fecha y Hora' },
        { id: 'tz_offset', title: 'tz_offset' },
        { id: 'bar', title: 'Presion' },
        { id: 'bar_absolute', title: 'Presion Absoluta' },
        { id: 'bar_trend', title: 'Tendencia de Presion' },
        { id: 'dew_point', title: 'Punto de rocio' },
        { id: 'et_day', title: 'Evapotranspiracion' },
        { id: 'forecast_rule', title: 'Regla Pronostico' },
        { id: 'forecast_desc', title: 'Pronostico' },
        { id: 'heat_index', title: 'Indice de calor' },
        { id: 'hum_out', title: 'Humedad' },
        { id: 'rain_15_min_clicks', title: 'Lluvia 15 minutos clicks' },
        { id: 'rain_15_min_in', title: 'Lluvia 15 minutos in' },
        { id: 'rain_15_min_mm', title: 'Lluvia 15 minutos mm' },
        { id: 'rain_60_min_clicks', title: 'Lluvia 60 minutos clicks' },
        { id: 'rain_60_min_in', title: 'Lluvia 60 minutos in' },
        { id: 'rain_60_min_mm', title: 'Lluvia 60 minutos mm' },
        { id: 'rain_24_hr_clicks', title: 'Lluvia 24 horas clicks' },
        { id: 'rain_24_hr_in', title: 'Lluvia 24 horas in' },
        { id: 'rain_24_hr_mm', title: 'Lluvia 24 horas mm' },
        { id: 'rain_day_clicks', title: 'Lluvia dia clicks' },
        { id: 'rain_day_in', title: 'Lluvia dia in' },
        { id: 'rain_day_mm', title: 'Lluvia dia mm' },
        { id: 'rain_rate_clicks', title: 'Intensidad lluvia clicks' },
        { id: 'rain_rate_in', title: 'Intensidad lluvia in' },
        { id: 'rain_rate_mm', title: 'Intensidad lluvia mm' },
        { id: 'rain_storm_clicks', title: 'Tormenta clicks' },
        { id: 'rain_storm_in', title: 'Tormenta in' },
        { id: 'rain_storm_mm', title: 'Tormente mm' },
        { id: 'rain_storm_start_date', title: 'Inicio Tormenta' },
        { id: 'solar_rad', title: 'Radiacion Solar' },
        { id: 'temp_out', title: 'Temperatura' },
        { id: 'thsw_index', title: 'Indice THSW' },
        { id: 'uv', title: 'uv' },
        { id: 'wind_chill', title: 'Sensacion Termica' },
        { id: 'wind_dir', title: 'Direccion del viento' },
        { id: 'wind_dir_of_gust_10_min', title: 'Direccion de Rafaga' },
        { id: 'wind_gust_10_min', title: 'Rafaga 10 min' },
        { id: 'wind_speed', title: 'Velocidad del viento' },
        { id: 'wind_speed_2_min', title: 'Velocidad del viento 2 min' },
        { id: 'wind_speed_10_min', title: 'Velocidad del viento 10 min' },
        { id: 'wet_bulb', title: 'Bulbo humedo' },
      ];

      const transformedData = data.map((record) => {
        const transformedRecord = {};
        headers.forEach((header) => {
          let value = record[header.id] || '';
          if (
            ['temp_out', 'thsw_index', 'wind_chill', 'wet_bulb'].includes(
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

  // Obtiene la informacion de una estacion espeficica por el Id de la estacion
  async getDataByStationId(id: string): Promise<StationInfo[]> {
    const url = `${this.apiUrlData}${id}?api-key=${process.env.API_KEY}`;
    return await this.fetchData(url);
  }

  // Obtiene todas las estaciones de la base de datos
  async getMapStations(): Promise<Stations[]> {
    return await this.stationsModel.find().exec();
  }

  // CRON obtiene las estaciones a las que se tenga acceso desde la API
  @Cron('0 0 * * *') // Run every day at midnight
  async saveStationsCron(): Promise<void> {
    await this.getStations();
  }

  // CRON obtiene los datos de las estaciones a las que tenga acceso desde la api
  @Cron('*/5 * * * *') // Run every 5 minutes
  async saveDataStationsCron(): Promise<void> {
    await this.getDataStation();
  }
}
function convertFtoC(value: number) {
  const celsius = ((value - 32) * 5) / 9;
  return celsius;
}
