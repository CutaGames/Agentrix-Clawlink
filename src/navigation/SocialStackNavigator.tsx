import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SocialStackParamList } from './types';
import { colors } from '../theme/colors';
import { FeedScreen } from '../screens/social/FeedScreen';
import { PostDetailScreen } from '../screens/social/PostDetailScreen';
import { UserProfileScreen } from '../screens/social/UserProfileScreen';
import { CreatePostScreen } from '../screens/social/CreatePostScreen';
// Merged from Chat tab
import { ChatListScreen } from '../screens/social/ChatListScreen';
import { DirectMessageScreen } from '../screens/social/DirectMessageScreen';
import { GroupChatScreen } from '../screens/social/GroupChatScreen';

const Stack = createNativeStackNavigator<SocialStackParamList>();

export function SocialStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgSecondary },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.bgPrimary },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Feed" component={FeedScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ title: 'Post' }} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ title: 'New Post', presentation: 'modal' }} />
      {/* Merged Chat screens */}
      <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Chats' }} />
      <Stack.Screen name="DirectMessage" component={DirectMessageScreen} options={({ route }) => ({ title: route.params.userName })} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} options={({ route }) => ({ title: route.params.groupName })} />
    </Stack.Navigator>
  );
}
