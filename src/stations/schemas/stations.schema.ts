import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Stations {
  _id?: string;

  @Prop()
  station_id: number;

  @Prop({ unique: true, required: true })
  station_id_uuid: string;

  @Prop()
  station_name: string;

  @Prop()
  gateway_id: number;

  @Prop()
  gateway_id_hex: string;

  @Prop()
  product_number: string;

  @Prop()
  username: string;

  @Prop()
  user_email: string;

  @Prop()
  company_name: string;

  @Prop()
  active: boolean;

  @Prop()
  private: boolean;

  @Prop()
  recording_interval: number;

  @Prop()
  firmware_version: string;

  @Prop()
  imei: string;

  @Prop()
  registered_date: number;

  @Prop()
  subscription_end_date: number;

  @Prop()
  time_zone: string;

  @Prop()
  city: string;

  @Prop()
  region: string;

  @Prop()
  country: string;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop()
  elevation: number;
}

export const StationsSchema = SchemaFactory.createForClass(Stations);
