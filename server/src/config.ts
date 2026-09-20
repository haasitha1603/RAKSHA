import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import webPush from 'web-push';
import crypto from 'crypto';

dotenv.config();

const envPath = path.resolve(process.cwd(), '.env');

// Auto-generate VAPID keys and JWT_SECRET if missing in development
if (process.env.NODE_ENV !== 'production') {
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  let updated = false;
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change-me-to-a-long-random-string') {
    const randomSecret = crypto.randomBytes(32).toString('hex');
    process.env.JWT_SECRET = randomSecret;
    if (envContent.includes('JWT_SECRET=')) {
      envContent = envContent.replace(/JWT_SECRET=.*/, `JWT_SECRET=${randomSecret}`);
    } else {
      envContent += `\nJWT_SECRET=${randomSecret}`;
    }
    updated = true;
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    const vapidKeys = webPush.generateVAPIDKeys();
    process.env.VAPID_PUBLIC_KEY = vapidKeys.publicKey;
    process.env.VAPID_PRIVATE_KEY = vapidKeys.privateKey;
    if (envContent.includes('VAPID_PUBLIC_KEY=')) {
      envContent = envContent.replace(/VAPID_PUBLIC_KEY=.*/, `VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
      envContent = envContent.replace(/VAPID_PRIVATE_KEY=.*/, `VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
    } else {
      envContent += `\nVAPID_PUBLIC_KEY=${vapidKeys.publicKey}\nVAPID_PRIVATE_KEY=${vapidKeys.privateKey}`;
    }
    updated = true;
  }

  if (updated && fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envContent.trim() + '\n');
  }
}

const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(16).default('development-secret-key-32-chars-long!'),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  DATABASE_URL: z.string().default('postgresql://postgres:1603@localhost:5432/raksha'),
  DB_PATH: z.string().default('./data/raksha.db'),
  DEMO_CENTER_LAT: z.coerce.number().default(28.6139),
  DEMO_CENTER_LNG: z.coerce.number().default(77.2090),
  DEMO_RESPONDER_KEY: z.string().default('raksha-demo'),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:contact@example.org'),
  SMS_PROVIDER: z.enum(['mock', 'twilio']).default('mock'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  DEMO_MODE: z.coerce.boolean().default(false),
  ASSISTANT_PROVIDER: z.enum(['anthropic', 'basic']).default('basic'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ASSISTANT_MODEL: z.string().default('claude-3-haiku-20240307'),
  NOMINATIM_USER_AGENT: z.string().default('Raksha-Safety/1.0 (contact: support@raksha.internal)'),
  TILE_URL: z.string().default('https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
  TEAM_NAME: z.string().default('Team Raksha'),
  CONTACT_EMAIL: z.string().default(''),
  CONTACT_PHONE: z.string().default(''),
  ORG_ADDRESS: z.string().default(''),
  LEGAL_JURISDICTION: z.string().default('India'),
  COUNTRY_DEFAULT: z.string().default('IN'),
});

const parsed = configSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid configuration:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
