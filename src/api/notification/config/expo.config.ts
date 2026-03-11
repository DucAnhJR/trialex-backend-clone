import { Injectable } from '@nestjs/common';
import { Expo } from 'expo-server-sdk';

@Injectable()
export class ExpoConfig {
  private expo: Expo;

  constructor() {
    this.expo = new Expo({});
  }

  getExpoInstance(): Expo {
    return this.expo;
  }
}
