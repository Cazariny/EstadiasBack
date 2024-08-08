import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as moment from 'moment-timezone';
import { Document, Types } from 'mongoose';

@Schema()
export class ScrapStationsInfo extends Document {

  @Prop({ type: Types.ObjectId, ref: 'ScrapStations', required: true })
  stations: Types.ObjectId; // Referencia a la colección Stations

  @Prop({ required: true })
  station_id_uuid: string;

  @Prop()
  temperature: string;

  // @Prop()
  // humidity: string;

  // @Prop()
  // wind: string;

  // @Prop()
  // barometer: string;

  @Prop({ type: Date, default: moment.tz(Date.now(), "America/Mexico_City") })
  horagGen: Date;
}

export const ScrapStationsInfoSchema = SchemaFactory.createForClass(ScrapStationsInfo);