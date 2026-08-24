import { View, Text, Image, TouchableOpacity, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { router } from 'expo-router';
import { useProfile } from '../lib/profilesStore';

/**
 * A commenter's avatar, showing their real photo when this device has one.
 *
 * Comments store only a name, initials and a colour, so every avatar in a
 * thread rendered as initials — including for someone whose photo was already
 * on screen in the post directly above it. Widening `addComment` would only fix
 * comments written from now on; resolving the author against the profile
 * directory fixes the ones already written too, and keeps showing the current
 * photo after they change it rather than a copy frozen at comment time.
 *
 * Falls back to initials on a coloured circle, which is what every comment
 * looked like before, so a commenter this device has never recorded is
 * unchanged.
 */
export function CommentAvatar({
  author, initials, color, city, state, avatarStyle, textStyle,
}: {
  author: string;
  initials: string;
  /** Fallback circle colour. Omit to keep whatever `avatarStyle` already sets. */
  color?: string;
  city?: string;
  state?: string;
  avatarStyle: StyleProp<ViewStyle>;
  textStyle: StyleProp<TextStyle>;
}) {
  const profile = useProfile(undefined, author);
  const photo = profile?.photo;

  return (
    <TouchableOpacity
      onPress={() => router.push({
        pathname: '/user-profile',
        params: {
          name: author,
          initials,
          color: profile?.color || color || '',
          // Churches comment too, and their profile screen is laid out
          // differently — send the account type we resolved, not an assumption.
          type: profile?.accountType === 'church' ? 'church' : 'user',
          city: profile?.city || city || '',
          state: profile?.state || state || '',
          photo: photo || '',
          // Carrying the id means the profile screen opens the right account
          // instead of matching on a display name two people could share.
          authorId: profile?.id || '',
        },
      })}
    >
      {/* The image sits inside the circle rather than replacing it, so the
          avatar keeps its shape and size from a single style either way. */}
      <View style={[avatarStyle, { overflow: 'hidden' }, !photo && color ? { backgroundColor: color } : null]}>
        {photo
          ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} />
          : <Text style={textStyle}>{initials}</Text>}
      </View>
    </TouchableOpacity>
  );
}
