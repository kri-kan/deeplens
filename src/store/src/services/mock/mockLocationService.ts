export interface DeliveryLocation {
  pincode: string;
  city: string;
  state: string;
  transitDays: number;
  isServiceable: boolean;
  courier: string;
}

const PINCODE_DIRECTORY: Record<string, { city: string; state: string; transitDays: number }> = {
  '500081': { city: 'Hyderabad', state: 'Telangana', transitDays: 2 },
  '500032': { city: 'Hyderabad', state: 'Telangana', transitDays: 2 },
  '560001': { city: 'Bengaluru', state: 'Karnataka', transitDays: 2 },
  '560034': { city: 'Bengaluru', state: 'Karnataka', transitDays: 2 },
  '600001': { city: 'Chennai', state: 'Tamil Nadu', transitDays: 3 },
  '400001': { city: 'Mumbai', state: 'Maharashtra', transitDays: 3 },
  '110001': { city: 'New Delhi', state: 'Delhi', transitDays: 3 },
  '700001': { city: 'Kolkata', state: 'West Bengal', transitDays: 4 },
  '380001': { city: 'Ahmedabad', state: 'Gujarat', transitDays: 3 },
  '682001': { city: 'Kochi', state: 'Kerala', transitDays: 3 },
  '520001': { city: 'Vijayawada', state: 'Andhra Pradesh', transitDays: 2 },
};

export const mockLocationService = {
  async lookupPincode(pincode: string): Promise<DeliveryLocation | null> {
    await new Promise((r) => setTimeout(r, 400));
    const clean = pincode.replace(/\D/g, '');
    if (clean.length !== 6) return null;

    if (PINCODE_DIRECTORY[clean]) {
      const data = PINCODE_DIRECTORY[clean];
      return {
        pincode: clean,
        city: data.city,
        state: data.state,
        transitDays: data.transitDays,
        isServiceable: true,
        courier: 'BlueDart Express Handloom Wing',
      };
    }

    // Fallback estimation for any other valid 6-digit Indian pincode
    return {
      pincode: clean,
      city: 'Domestic Delivery Zone',
      state: 'India',
      transitDays: 4,
      isServiceable: true,
      courier: 'Delhivery Handloom Express',
    };
  },

  async reverseGeocodeCoords(latitude: number, longitude: number): Promise<DeliveryLocation> {
    await new Promise((r) => setTimeout(r, 700));
    // Default to Hyderabad / Deccan region for local testing
    return {
      pincode: '500081',
      city: 'Hyderabad (Hitec City)',
      state: 'Telangana',
      transitDays: 2,
      isServiceable: true,
      courier: 'BlueDart 2-Day Air Express',
    };
  }
};
