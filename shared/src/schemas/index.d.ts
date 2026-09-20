import { z } from 'zod';
export declare const signupSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodString;
    ageConfirmed18: z.ZodLiteral<true>;
    consents: z.ZodObject<{
        terms_privacy: z.ZodLiteral<true>;
    }, "strip", z.ZodTypeAny, {
        terms_privacy: true;
    }, {
        terms_privacy: true;
    }>;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
    displayName: string;
    ageConfirmed18: true;
    consents: {
        terms_privacy: true;
    };
}, {
    username: string;
    password: string;
    displayName: string;
    ageConfirmed18: true;
    consents: {
        terms_privacy: true;
    };
}>;
export declare const loginSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
}, {
    username: string;
    password: string;
}>;
export declare const updateMeSchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    settings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    displayName?: string | undefined;
    settings?: Record<string, any> | undefined;
}, {
    displayName?: string | undefined;
    settings?: Record<string, any> | undefined;
}>;
export declare const setPinsSchema: z.ZodEffects<z.ZodObject<{
    safetyPin: z.ZodString;
    duressPin: z.ZodString;
}, "strip", z.ZodTypeAny, {
    safetyPin: string;
    duressPin: string;
}, {
    safetyPin: string;
    duressPin: string;
}>, {
    safetyPin: string;
    duressPin: string;
}, {
    safetyPin: string;
    duressPin: string;
}>;
export declare const consentUpdateSchema: z.ZodObject<{
    type: z.ZodEnum<["terms_privacy", "location", "guardian_share", "push", "voice", "motion", "evidence", "report_visibility", "guardian_told"]>;
    granted: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "push" | "terms_privacy" | "location" | "guardian_share" | "voice" | "motion" | "evidence" | "report_visibility" | "guardian_told";
    granted: boolean;
}, {
    type: "push" | "terms_privacy" | "location" | "guardian_share" | "voice" | "motion" | "evidence" | "report_visibility" | "guardian_told";
    granted: boolean;
}>;
export declare const locationPointSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    label: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
    label: string;
}, {
    lat: number;
    lng: number;
    label?: string | undefined;
}>;
export declare const planRouteSchema: z.ZodObject<{
    origin: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        label: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
        label: string;
    }, {
        lat: number;
        lng: number;
        label?: string | undefined;
    }>;
    destination: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        label: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
        label: string;
    }, {
        lat: number;
        lng: number;
        label?: string | undefined;
    }>;
    mode: z.ZodDefault<z.ZodEnum<["walk", "two-wheeler", "car", "transit"]>>;
    departAt: z.ZodOptional<z.ZodString>;
    safetyPriority: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    origin: {
        lat: number;
        lng: number;
        label: string;
    };
    destination: {
        lat: number;
        lng: number;
        label: string;
    };
    mode: "walk" | "two-wheeler" | "car" | "transit";
    safetyPriority: number;
    departAt?: string | undefined;
}, {
    origin: {
        lat: number;
        lng: number;
        label?: string | undefined;
    };
    destination: {
        lat: number;
        lng: number;
        label?: string | undefined;
    };
    mode?: "walk" | "two-wheeler" | "car" | "transit" | undefined;
    departAt?: string | undefined;
    safetyPriority?: number | undefined;
}>;
export declare const positionItemSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    acc: z.ZodNumber;
    speed: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    heading: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    ts: z.ZodString;
    battery: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    online: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
    acc: number;
    ts: string;
    online: boolean;
    speed?: number | null | undefined;
    heading?: number | null | undefined;
    battery?: number | null | undefined;
}, {
    lat: number;
    lng: number;
    acc: number;
    ts: string;
    speed?: number | null | undefined;
    heading?: number | null | undefined;
    battery?: number | null | undefined;
    online?: boolean | undefined;
}>;
export declare const positionBatchSchema: z.ZodObject<{
    positions: z.ZodArray<z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        acc: z.ZodNumber;
        speed: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        heading: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        ts: z.ZodString;
        battery: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        online: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
        acc: number;
        ts: string;
        online: boolean;
        speed?: number | null | undefined;
        heading?: number | null | undefined;
        battery?: number | null | undefined;
    }, {
        lat: number;
        lng: number;
        acc: number;
        ts: string;
        speed?: number | null | undefined;
        heading?: number | null | undefined;
        battery?: number | null | undefined;
        online?: boolean | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    positions: {
        lat: number;
        lng: number;
        acc: number;
        ts: string;
        online: boolean;
        speed?: number | null | undefined;
        heading?: number | null | undefined;
        battery?: number | null | undefined;
    }[];
}, {
    positions: {
        lat: number;
        lng: number;
        acc: number;
        ts: string;
        speed?: number | null | undefined;
        heading?: number | null | undefined;
        battery?: number | null | undefined;
        online?: boolean | undefined;
    }[];
}>;
export declare const safetyCheckResponseSchema: z.ZodObject<{
    response: z.ZodEnum<["safe", "help"]>;
}, "strip", z.ZodTypeAny, {
    response: "safe" | "help";
}, {
    response: "safe" | "help";
}>;
export declare const plannedStopSchema: z.ZodObject<{
    label: z.ZodString;
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    radiusM: z.ZodDefault<z.ZodNumber>;
    untilTs: z.ZodString;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
    label: string;
    radiusM: number;
    untilTs: string;
}, {
    lat: number;
    lng: number;
    label: string;
    untilTs: string;
    radiusM?: number | undefined;
}>;
export declare const createJourneySchema: z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["walk", "two-wheeler", "car", "transit"]>>;
    origin: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        label: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
        label: string;
    }, {
        lat: number;
        lng: number;
        label?: string | undefined;
    }>;
    destination: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        label: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
        label: string;
    }, {
        lat: number;
        lng: number;
        label?: string | undefined;
    }>;
    selectedRoute: z.ZodAny;
    plannedEta: z.ZodString;
    guardianIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    checkpointIntervalMin: z.ZodOptional<z.ZodNumber>;
    plannedStops: z.ZodOptional<z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        radiusM: z.ZodDefault<z.ZodNumber>;
        untilTs: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
        label: string;
        radiusM: number;
        untilTs: string;
    }, {
        lat: number;
        lng: number;
        label: string;
        untilTs: string;
        radiusM?: number | undefined;
    }>, "many">>;
    cab: z.ZodOptional<z.ZodObject<{
        vehicleNumber: z.ZodOptional<z.ZodString>;
        driverName: z.ZodOptional<z.ZodString>;
        company: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        vehicleNumber?: string | undefined;
        driverName?: string | undefined;
        company?: string | undefined;
    }, {
        vehicleNumber?: string | undefined;
        driverName?: string | undefined;
        company?: string | undefined;
    }>>;
    timingProfile: z.ZodDefault<z.ZodEnum<["production", "demo"]>>;
}, "strip", z.ZodTypeAny, {
    origin: {
        lat: number;
        lng: number;
        label: string;
    };
    destination: {
        lat: number;
        lng: number;
        label: string;
    };
    mode: "walk" | "two-wheeler" | "car" | "transit";
    plannedEta: string;
    guardianIds: string[];
    timingProfile: "production" | "demo";
    selectedRoute?: any;
    checkpointIntervalMin?: number | undefined;
    plannedStops?: {
        lat: number;
        lng: number;
        label: string;
        radiusM: number;
        untilTs: string;
    }[] | undefined;
    cab?: {
        vehicleNumber?: string | undefined;
        driverName?: string | undefined;
        company?: string | undefined;
    } | undefined;
}, {
    origin: {
        lat: number;
        lng: number;
        label?: string | undefined;
    };
    destination: {
        lat: number;
        lng: number;
        label?: string | undefined;
    };
    plannedEta: string;
    mode?: "walk" | "two-wheeler" | "car" | "transit" | undefined;
    selectedRoute?: any;
    guardianIds?: string[] | undefined;
    checkpointIntervalMin?: number | undefined;
    plannedStops?: {
        lat: number;
        lng: number;
        label: string;
        untilTs: string;
        radiusM?: number | undefined;
    }[] | undefined;
    cab?: {
        vehicleNumber?: string | undefined;
        driverName?: string | undefined;
        company?: string | undefined;
    } | undefined;
    timingProfile?: "production" | "demo" | undefined;
}>;
export declare const createSosSchema: z.ZodObject<{
    journeyId: z.ZodOptional<z.ZodString>;
    trigger: z.ZodDefault<z.ZodEnum<["button", "hold", "triple_tap", "shake", "voice", "duress_pin", "guardian_request", "auto_escalation"]>>;
    discreet: z.ZodDefault<z.ZodBoolean>;
    location: z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
        acc: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        lat: number;
        lng: number;
        acc: number;
    }, {
        lat: number;
        lng: number;
        acc?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    location: {
        lat: number;
        lng: number;
        acc: number;
    };
    trigger: "guardian_request" | "voice" | "button" | "hold" | "triple_tap" | "shake" | "duress_pin" | "auto_escalation";
    discreet: boolean;
    journeyId?: string | undefined;
}, {
    location: {
        lat: number;
        lng: number;
        acc?: number | undefined;
    };
    journeyId?: string | undefined;
    trigger?: "guardian_request" | "voice" | "button" | "hold" | "triple_tap" | "shake" | "duress_pin" | "auto_escalation" | undefined;
    discreet?: boolean | undefined;
}>;
export declare const cancelSosSchema: z.ZodObject<{
    pin: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pin?: string | undefined;
}, {
    pin?: string | undefined;
}>;
export declare const resolveIncidentSchema: z.ZodObject<{
    pin: z.ZodString;
    falseAlarm: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    pin: string;
    falseAlarm: boolean;
}, {
    pin: string;
    falseAlarm?: boolean | undefined;
}>;
export declare const responderLoginSchema: z.ZodObject<{
    facilityId: z.ZodString;
    key: z.ZodString;
}, "strip", z.ZodTypeAny, {
    facilityId: string;
    key: string;
}, {
    facilityId: string;
    key: string;
}>;
export declare const responderDispatchSchema: z.ZodObject<{
    etaMinutes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    etaMinutes: number;
}, {
    etaMinutes: number;
}>;
export declare const createGuardianSchema: z.ZodObject<{
    name: z.ZodString;
    phone: z.ZodString;
    relation: z.ZodString;
    priority: z.ZodDefault<z.ZodNumber>;
    toldConfirmed: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    name: string;
    phone: string;
    relation: string;
    priority: number;
    toldConfirmed: true;
}, {
    name: string;
    phone: string;
    relation: string;
    toldConfirmed: true;
    priority?: number | undefined;
}>;
export declare const createReportSchema: z.ZodObject<{
    category: z.ZodEnum<["lighting", "unsafe_road", "suspicious", "harassment", "accident", "hazard", "crowd", "other"]>;
    severity: z.ZodDefault<z.ZodNumber>;
    text: z.ZodDefault<z.ZodString>;
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    visibilityAgreed: z.ZodLiteral<true>;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
    category: "lighting" | "unsafe_road" | "suspicious" | "harassment" | "accident" | "hazard" | "crowd" | "other";
    severity: number;
    text: string;
    visibilityAgreed: true;
}, {
    lat: number;
    lng: number;
    category: "lighting" | "unsafe_road" | "suspicious" | "harassment" | "accident" | "hazard" | "crowd" | "other";
    visibilityAgreed: true;
    severity?: number | undefined;
    text?: string | undefined;
}>;
export declare const voteReportSchema: z.ZodObject<{
    vote: z.ZodEnum<["confirm", "deny"]>;
}, "strip", z.ZodTypeAny, {
    vote: "confirm" | "deny";
}, {
    vote: "confirm" | "deny";
}>;
export declare const createFakeCallSchema: z.ZodObject<{
    callerName: z.ZodString;
    callerNumber: z.ZodString;
    avatarColor: z.ZodDefault<z.ZodString>;
    ringtone: z.ZodDefault<z.ZodEnum<["classic", "digital", "vibrate"]>>;
    uiStyle: z.ZodDefault<z.ZodEnum<["classic", "modern"]>>;
    scriptJson: z.ZodString;
    useRecording: z.ZodDefault<z.ZodBoolean>;
    scheduledFor: z.ZodString;
    ringSeconds: z.ZodDefault<z.ZodNumber>;
    notifyGuardian: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    callerName: string;
    callerNumber: string;
    avatarColor: string;
    ringtone: "classic" | "digital" | "vibrate";
    uiStyle: "classic" | "modern";
    scriptJson: string;
    useRecording: boolean;
    scheduledFor: string;
    ringSeconds: number;
    notifyGuardian: boolean;
}, {
    callerName: string;
    callerNumber: string;
    scriptJson: string;
    scheduledFor: string;
    avatarColor?: string | undefined;
    ringtone?: "classic" | "digital" | "vibrate" | undefined;
    uiStyle?: "classic" | "modern" | undefined;
    useRecording?: boolean | undefined;
    ringSeconds?: number | undefined;
    notifyGuardian?: boolean | undefined;
}>;
export declare const pushSubscribeSchema: z.ZodObject<{
    endpoint: z.ZodString;
    keys: z.ZodObject<{
        p256dh: z.ZodString;
        auth: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        p256dh: string;
        auth: string;
    }, {
        p256dh: string;
        auth: string;
    }>;
}, "strip", z.ZodTypeAny, {
    keys: {
        p256dh: string;
        auth: string;
    };
    endpoint: string;
}, {
    keys: {
        p256dh: string;
        auth: string;
    };
    endpoint: string;
}>;
export declare const demoConfigSchema: z.ZodObject<{
    timingProfile: z.ZodOptional<z.ZodEnum<["production", "demo"]>>;
    centerLat: z.ZodOptional<z.ZodNumber>;
    centerLng: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timingProfile?: "production" | "demo" | undefined;
    centerLat?: number | undefined;
    centerLng?: number | undefined;
}, {
    timingProfile?: "production" | "demo" | undefined;
    centerLat?: number | undefined;
    centerLng?: number | undefined;
}>;
//# sourceMappingURL=index.d.ts.map