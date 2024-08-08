import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import * as moment from 'moment-timezone';
import { Document, Types } from 'mongoose';

@Schema()
export class Data {
  @Prop({ type: Object, required: true })
  data: any;
}

export const DatoSchema = SchemaFactory.createForClass(Data);

@Schema()
export class Sensor {
  @Prop({ required: true })
  lsid: number;

  // @Prop({ type: [DatoSchema]})
  @Prop({ type: Object})
  data: any;

  @Prop({ required: true })
  sensor_type: number;

  @Prop({ required: true })
  data_structure_type: number;
}

export const SensorSchema = SchemaFactory.createForClass(Sensor);

@Schema()
export class StationInfo extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Stations', required: true })
  stations: Types.ObjectId; // Referencia a la colección Stations

  @Prop({ required: true })
  station_id_uuid: string;

  @Prop({ type: [SensorSchema], default: [] })
  sensors: Sensor[];

  @Prop()
  generated_at: number;

  @Prop({ required: true })
  station_id: number;

  @Prop({ type: Date, default: moment.tz(Date.now(), "America/Mexico_City") })
  horagGen: Date;
}

export const StationInfoSchema = SchemaFactory.createForClass(StationInfo);
