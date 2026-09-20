import { z } from 'zod';

export const signupSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(50),
  ageConfirmed18: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm you are 18 or older to use Raksha' })
  }),
  consents: z.object({
    terms_privacy: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the Terms of Service and Privacy Policy' })
    })
  })
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export const updateMeSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  settings: z.record(z.any()).optional()
});

export const setPinsSchema = z.object({
  safetyPin: z.string().regex(/^\d{4,6}$/, 'Safety PIN must be 4 to 6 digits'),
  duressPin: z.string().regex(/^\d{4,6}$/, 'Duress PIN must be 4 to 6 digits')
}).refine((data) => data.safetyPin !== data.duressPin, {
  message: 'Safety PIN and Duress PIN must be different',
  path: ['duressPin']
});

export const consentUpdateSchema = z.object({
  type: z.enum([
    'terms_privacy',
    'location',
    'guardian_share',
    'push',
    'voice',
    'motion',
    'evidence',
    'report_visibility',
    'guardian_told'
  ]),
  granted: z.boolean()
});

export const locationPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  label: z.string().default('Location')
});

export const planRouteSchema = z.object({
  origin: locationPointSchema,
  destination: locationPointSchema,
  mode: z.enum(['walk', 'two-wheeler', 'car', 'transit']).default('walk'),
  departAt: z.string().optional(),
  safetyPriority: z.number().min(0).max(100).default(60)
});

export const positionItemSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  acc: z.number().min(0),
  speed: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
  ts: z.string(),
  battery: z.number().nullable().optional(),
  online: z.boolean().default(true)
});

export const positionBatchSchema = z.object({
  positions: z.array(positionItemSchema).min(1)
});

export const safetyCheckResponseSchema = z.object({
  response: z.enum(['safe', 'help'])
});

export const plannedStopSchema = z.object({
  label: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().min(10).default(100),
  untilTs: z.string()
});

export const createJourneySchema = z.object({
  mode: z.enum(['walk', 'two-wheeler', 'car', 'transit']).default('walk'),
  origin: locationPointSchema,
  destination: locationPointSchema,
  selectedRoute: z.any(),
  plannedEta: z.string(),
  guardianIds: z.array(z.string()).default([]),
  checkpointIntervalMin: z.number().min(1).max(60).optional(),
  plannedStops: z.array(plannedStopSchema).optional(),
  cab: z.object({
    vehicleNumber: z.string().optional(),
    driverName: z.string().optional(),
    company: z.string().optional()
  }).optional(),
  timingProfile: z.enum(['production', 'demo']).default('production'),
  drill: z.boolean().optional().default(false),
  drillScenario: z.string().optional()
});

export const createSosSchema = z.object({
  journeyId: z.string().optional(),
  trigger: z.enum(['button', 'hold', 'triple_tap', 'shake', 'voice', 'duress_pin', 'guardian_request', 'auto_escalation']).default('button'),
  discreet: z.boolean().default(false),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
    acc: z.number().default(10)
  })
});

export const cancelSosSchema = z.object({
  pin: z.string().optional()
});

export const resolveIncidentSchema = z.object({
  pin: z.string().min(4).max(6),
  falseAlarm: z.boolean().default(false)
});

export const responderLoginSchema = z.object({
  facilityId: z.string().min(1),
  key: z.string().min(1)
});

export const responderDispatchSchema = z.object({
  etaMinutes: z.number().min(1).max(120)
});

export const createGuardianSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(7, 'Phone number must be valid'),
  relation: z.string().min(2, 'Relation is required'),
  priority: z.number().min(1).max(5).default(1),
  toldConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'You must confirm you have informed this guardian' })
  })
});

export const createReportSchema = z.object({
  category: z.enum(['lighting', 'unsafe_road', 'suspicious', 'harassment', 'accident', 'hazard', 'crowd', 'other']),
  severity: z.number().min(1).max(5).default(3),
  text: z.string().max(280).default(''),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  visibilityAgreed: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to public anonymised visibility of this safety report' })
  })
});

export const voteReportSchema = z.object({
  vote: z.enum(['confirm', 'deny'])
});

export const createFakeCallSchema = z.object({
  callerName: z.string().min(1).max(40),
  callerNumber: z.string().min(3).max(25),
  avatarColor: z.string().default('#4338CA'),
  ringtone: z.enum(['classic', 'digital', 'vibrate']).default('classic'),
  uiStyle: z.enum(['classic', 'modern']).default('classic'),
  scriptJson: z.string(),
  useRecording: z.boolean().default(false),
  scheduledFor: z.string(),
  ringSeconds: z.number().min(10).max(60).default(30),
  notifyGuardian: z.boolean().default(false)
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

export const demoConfigSchema = z.object({
  timingProfile: z.enum(['production', 'demo']).optional(),
  centerLat: z.number().optional(),
  centerLng: z.number().optional()
});
