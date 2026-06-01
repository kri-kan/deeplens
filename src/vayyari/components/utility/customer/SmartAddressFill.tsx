import React, { useState } from 'react';
import { View } from 'react-native';
import { TextInput, Button, useTheme } from 'react-native-paper';

export interface SmartAddressData {
    firstName?: string;
    lastName?: string;
    phone?: string;
    pincode?: string;
    address?: string;
}

interface SmartAddressFillProps {
    onFill: (data: SmartAddressData) => void;
    onCancel: () => void;
}

export const SmartAddressFill: React.FC<SmartAddressFillProps> = ({ onFill, onCancel }) => {
    const theme = useTheme();
    const [smartFillText, setSmartFillText] = useState('');

    const handleSmartFill = () => {
        if (!smartFillText) return;
        const text = smartFillText;
        const firstNameMatch = text.match(/first_name:\s*(.+)/i);
        const lastNameMatch = text.match(/last_name:\s*(.+)/i);
        const phoneMatch = text.match(/phone_number:\s*(.+)/i) || text.match(/phone:\s*(.+)/i);
        const pinMatch = text.match(/pincode:\s*(.+)/i) || text.match(/pin:\s*(.+)/i);
        const addrMatch = text.match(/address:\s*([\s\S]+)/i);

        onFill({
            firstName: firstNameMatch ? firstNameMatch[1].trim() : undefined,
            lastName: lastNameMatch ? lastNameMatch[1].trim() : undefined,
            phone: phoneMatch ? phoneMatch[1].trim() : undefined,
            pincode: pinMatch ? pinMatch[1].trim() : undefined,
            address: addrMatch ? addrMatch[1].trim() : undefined,
        });
        
        setSmartFillText('');
    };

    return (
        <View style={{ gap: 8 }}>
            <TextInput
                label="Paste Template Here"
                placeholder={"first_name: Krishna\nlast_name: Kanth\nphone_number: 9876543210\npincode: 500090\naddress:"}
                value={smartFillText}
                onChangeText={setSmartFillText}
                mode="outlined"
                multiline
                numberOfLines={6}
                style={{ backgroundColor: theme.colors.surfaceVariant }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button 
                    mode="contained" 
                    onPress={handleSmartFill}
                    disabled={!smartFillText}
                    style={{ flex: 1 }}
                >
                    Process
                </Button>
                <Button 
                    mode="outlined" 
                    onPress={onCancel}
                    style={{ flex: 1 }}
                >
                    Cancel
                </Button>
            </View>
        </View>
    );
};
