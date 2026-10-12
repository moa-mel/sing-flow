import validate, {
  RequiredEnvironment,
  RequiredEnvironmentTypes,
} from '@boxpositron/vre';

import { config } from 'dotenv';

config();

const runtimeEnvironment: RequiredEnvironment[] = [
  {
    name: 'PORT',
    type: RequiredEnvironmentTypes.Number,
  },
  {
    name: 'ALLOWED_DOMAINS',
    type: RequiredEnvironmentTypes.String,
  },
//   {
//     name: 'JWT_SECRET',
//     type: RequiredEnvironmentTypes.String,
//   },
//   {
//     name: 'REFRESH_JWT_SECRET',
//     type: RequiredEnvironmentTypes.String,
//   },
//   {
//     name: 'JWT_SECRET_EXPIRES',
//     type: RequiredEnvironmentTypes.String,
//   },
//   {
//     name: 'REFRESH_JWT_SECRET_EXPIRES',
//     type: RequiredEnvironmentTypes.String,
//   },

];

validate(runtimeEnvironment);

export const allowedDomains: string[] | undefined =
  process.env.ALLOWED_DOMAINS ? process.env.ALLOWED_DOMAINS.split(',') : undefined;
export const isProduction: boolean = process.env.NODE_ENV === 'production';
export const port: number = parseInt(process.env.PORT ?? '5000');

export const isProdEnvironment = process.env.ENVIRONMENT === 'production';

export const frontendDevOrigin = [/^http:\/\/localhost:\d+$/];

// export const jwtSecret: string = process.env.JWT_SECRET!;

export const redisHost = process.env.REDIS_HOST;
export const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
export const redisPassword = process.env.REDIS_PASSWORD;
export const redisUsername = process.env.REDIS_USERNAME || 'default';

// export const refreshJwtSecret: string = process.env.REFRESH_JWT_SECRET!;

// export const jwtExpiresIn: string = process.env.JWT_SECRET_EXPIRES!;

// export const refreshTokenExpiresIn: string =
//   process.env.REFRESH_JWT_SECRET_EXPIRES!;