import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class ScrapStations extends Document {
  _id?: string;

  @Prop({ unique: true, required: true })
  station_id_uuid: string;

  @Prop()
  station_name: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop()
  elevation: number;
}

export const ScrapStationsSchema = SchemaFactory.createForClass(ScrapStations);
