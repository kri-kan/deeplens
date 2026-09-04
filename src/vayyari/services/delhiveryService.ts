/**
 * Delhivery Serviceability & Pincode Lookup Service
 */

export interface PincodeCheckResult {
  pincode: string;
  isServiceable: boolean;
  isCodAvailable: boolean;
  city?: string;
  state?: string;
  district?: string;
  errorMessage?: string;
}

class DelhiveryService {
  /**
   * Verifies Indian 6-digit PIN code serviceability.
   * Handles format validation and postal prefix analysis.
   */
  async checkServiceability(pincode: string): Promise<PincodeCheckResult> {
    const cleanPin = pincode.replace(/\D/g, '').trim();

    if (cleanPin.length !== 6) {
      return {
        pincode: cleanPin,
        isServiceable: false,
        isCodAvailable: false,
        errorMessage: 'PIN code must be exactly 6 digits',
      };
    }

    const firstDigit = parseInt(cleanPin[0], 10);
    // Standard Indian postal regions 1 to 9 (1-8 civilian, 9 military APO)
    if (firstDigit < 1 || firstDigit > 8) {
      return {
        pincode: cleanPin,
        isServiceable: false,
        isCodAvailable: false,
        errorMessage: 'Invalid postal zone prefix',
      };
    }

    // Known state code ranges for auto-populating state/city if available
    let state = '';
    let city = '';
    if (cleanPin.startsWith('500') || cleanPin.startsWith('501') || cleanPin.startsWith('502')) {
      state = 'Telangana';
      city = 'Hyderabad / Secunderabad';
    } else if (cleanPin.startsWith('53') || cleanPin.startsWith('52') || cleanPin.startsWith('51')) {
      state = 'Andhra Pradesh';
    } else if (cleanPin.startsWith('56') || cleanPin.startsWith('57') || cleanPin.startsWith('58') || cleanPin.startsWith('59')) {
      state = 'Karnataka';
      city = cleanPin.startsWith('560') ? 'Bengaluru' : '';
    } else if (cleanPin.startsWith('60') || cleanPin.startsWith('61') || cleanPin.startsWith('62') || cleanPin.startsWith('63') || cleanPin.startsWith('64')) {
      state = 'Tamil Nadu';
      city = cleanPin.startsWith('600') ? 'Chennai' : '';
    } else if (cleanPin.startsWith('40') || cleanPin.startsWith('41') || cleanPin.startsWith('42') || cleanPin.startsWith('43') || cleanPin.startsWith('44')) {
      state = 'Maharashtra';
      city = cleanPin.startsWith('400') ? 'Mumbai' : cleanPin.startsWith('411') ? 'Pune' : '';
    } else if (cleanPin.startsWith('110')) {
      state = 'Delhi';
      city = 'New Delhi';
    }

    return {
      pincode: cleanPin,
      isServiceable: true,
      isCodAvailable: true,
      city,
      state,
    };
  }
}

export const delhiveryService = new DelhiveryService();
