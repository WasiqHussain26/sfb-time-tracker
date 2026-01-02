import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as express from 'express';

const server = express();

export const createNestServer = async (expressInstance) => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );
  
  // Enable CORS so your frontend can talk to it
  app.enableCors({
    origin: '*', // Allow all origins (easiest for Vercel)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.init();
  return server;
};

createNestServer(server)
  .then(v => console.log('Nest Ready'))
  .catch(err => console.error('Nest broken', err));

export default server;