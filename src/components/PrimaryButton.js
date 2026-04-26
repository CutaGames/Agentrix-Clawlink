import React from 'react';
import { Pressable, Text } from 'react-native';
import { colors } from '../theme/colors';
export const PrimaryButton = ({ title, onPress, style, disabled = false, }) => {
    return (<Pressable onPress={disabled ? undefined : onPress} disabled={disabled} style={({ pressed }) => ({
            backgroundColor: disabled ? colors.muted : (pressed ? '#2563EB' : colors.primary),
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 12,
            alignItems: 'center',
            opacity: disabled ? 0.6 : 1,
            ...style,
        })}>
      <Text style={{ color: 'white', fontWeight: '700' }}>{title}</Text>
    </Pressable>);
};
