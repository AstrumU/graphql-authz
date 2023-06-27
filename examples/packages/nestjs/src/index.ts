import { NestFactory } from '@nestjs/core';

import { AppModule } from './module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  return app.listen(4000);
}
bootstrap();
