import { plainToClass } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber, IsString, MinLength, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsNumber()
  @IsNotEmpty()
  PORT: number;
  @IsString()
  @IsNotEmpty()
  TELEGRAM_BOT_TOKEN: string;
  @IsString()
  @IsNotEmpty()
  BASE_WEB_APP_URL: string;
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;
  @IsString()
  @IsNotEmpty()
  COOKIES_SECRET: string;
  @IsBoolean()
  @IsNotEmpty()
  SECURE_COOKIES: boolean;
  @IsString()
  @IsNotEmpty()
  DATABASE_HOST: string;
  @IsString()
  @IsNotEmpty()
  DATABASE_NAME: string;
  @IsString()
  @IsNotEmpty()
  DATABASE_PASSWORD: string;
  @IsString()
  @IsNotEmpty()
  DATABASE_TYPE: string;
  @IsNumber()
  @IsNotEmpty()
  DATABASE_PORT: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
