export interface EmergencyContactNumber {
    label: string;
    number: string;
    description: string;
    category: 'all' | 'police' | 'women' | 'ambulance' | 'child';
}
export declare const EMERGENCY_NUMBERS_BY_COUNTRY: Record<string, EmergencyContactNumber[]>;
export declare function getEmergencyNumbers(countryCode?: string): EmergencyContactNumber[];
//# sourceMappingURL=emergencyNumbers.d.ts.map