export interface EmergencyContactNumber {
  label: string;
  number: string;
  description: string;
  category: 'all' | 'police' | 'women' | 'ambulance' | 'child';
}

export const EMERGENCY_NUMBERS_BY_COUNTRY: Record<string, EmergencyContactNumber[]> = {
  IN: [
    { label: 'All-Emergency', number: '112', description: 'National Emergency Helpline', category: 'all' },
    { label: 'Women Helpline', number: '1091', description: 'Immediate Women in Distress Helpline', category: 'women' },
    { label: 'National Women Helpline', number: '181', description: 'Domestic & Public Distress Support', category: 'women' },
    { label: 'Police Direct', number: '100', description: 'Police Control Room', category: 'police' },
    { label: 'Ambulance', number: '108', description: 'Emergency Medical Services', category: 'ambulance' },
    { label: 'Child Helpline', number: '1098', description: 'Childline India', category: 'child' },
  ],
  GENERIC: [
    { label: 'All-Emergency', number: '112', description: 'International Standard Emergency Number', category: 'all' },
  ]
};

export function getEmergencyNumbers(countryCode = 'IN'): EmergencyContactNumber[] {
  return EMERGENCY_NUMBERS_BY_COUNTRY[countryCode] || EMERGENCY_NUMBERS_BY_COUNTRY.GENERIC;
}
