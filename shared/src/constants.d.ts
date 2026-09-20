export declare const TIMING_PROFILES: {
    readonly production: {
        readonly positionIntervalMoving: 10000;
        readonly positionIntervalStationary: 30000;
        readonly positionIntervalEmergency: 5000;
        readonly connectivityLost: 90000;
        readonly stopDetect: 180000;
        readonly deviationSustain: 45000;
        readonly safetyCheckTimeout: 120000;
        readonly sosCancelWindow: 10000;
        readonly sosCancelWindowHighRisk: 5000;
        readonly guardianAckTimeout: 120000;
        readonly etaGracePercent: 0.15;
        readonly etaGraceMinMs: 300000;
        readonly checkpointIntervalDefault: 900000;
        readonly hysteresisMs: 120000;
    };
    readonly demo: {
        readonly positionIntervalMoving: 3000;
        readonly positionIntervalStationary: 3000;
        readonly positionIntervalEmergency: 2000;
        readonly connectivityLost: 15000;
        readonly stopDetect: 20000;
        readonly deviationSustain: 8000;
        readonly safetyCheckTimeout: 20000;
        readonly sosCancelWindow: 10000;
        readonly sosCancelWindowHighRisk: 5000;
        readonly guardianAckTimeout: 25000;
        readonly etaGracePercent: 0.15;
        readonly etaGraceMinMs: 30000;
        readonly checkpointIntervalDefault: 45000;
        readonly hysteresisMs: 20000;
    };
};
export type TimingProfileKey = keyof typeof TIMING_PROFILES;
export declare const REPORT_HALF_LIVES_DAYS: Record<string, number>;
export declare const REPORT_HARD_EXPIRY_HOURS: Record<string, number>;
export declare const APPROVED_HONEST_COPY: {
    prototypeNotice: string;
    honestFraming: string;
    riskDisclaimer: string;
    dataDisclaimer: string;
    modelComparisonLabel: string;
};
export declare const BANNED_PHRASES: readonly ["guarantee", "guaranteed", "100% safe", "instant police dispatch", "AI detects attacks", "24/7 monitored by Raksha", "faster treatment", "proven", "trusted by thousands"];
//# sourceMappingURL=constants.d.ts.map