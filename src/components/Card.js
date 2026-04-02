import React from 'react';
import { View } from 'react-native';
import { colors } from '../theme/colors';
export const Card = ({ style, children }) => {
    return (<View style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            ...style,
        }}>
      {children}
    </View>);
};
