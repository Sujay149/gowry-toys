import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewProps,
  type TextInputProps,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, FontSizes, FontWeights, LineHeights, Radius, Shadow, Sizes, Spacing } from '@/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export const BrandMark = ({ size = 64 }: { size?: number }) => (
  <View style={[styles.brandMark, { width: size, height: size, borderRadius: size * 0.3 }]}>
    <MaterialCommunityIcons name="horse-variant" size={size * 0.56} color={Colors.onPrimary} />
  </View>
);

/** Fades + lifts children in on mount. Used for soft screen entrances. */
export function FadeInView({
  children,
  delay = 0,
  offset = 12,
  duration = 420,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  offset?: number;
  duration?: number;
  style?: ViewProps['style'];
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, duration, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }),
            },
          ],
        },
      ]}>
      {children}
    </Animated.View>
  );
}

/** Gentle opacity pulse used for loading skeletons. */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = Radius.sm,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewProps['style'];
}) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: Colors.surfaceSecondary,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

/** Pressable that springs down smoothly on touch. */
export function PressableScale({
  children,
  onPress,
  disabled,
  style,
  scaleTo = 0.97,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewProps['style'];
  scaleTo?: number;
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      style={style}>
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'success';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewProps['style'];
  size?: 'md' | 'lg';
  arrow?: boolean;
  full?: boolean;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
  size = 'md',
  arrow = false,
  full = true,
}: AppButtonProps) {
  const isPrimary = variant === 'primary';
  const isSuccess = variant === 'success';
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';
  const isGhost = variant === 'ghost';

  const background = isPrimary
    ? Colors.primary
    : isSuccess
      ? Colors.successDark
      : isDanger
        ? Colors.danger
        : isSecondary
          ? Colors.primaryLight
          : 'transparent';

  const color = isPrimary || isSuccess || isDanger ? Colors.onPrimary : Colors.primary;
  const inactive = disabled || loading;

  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      onPressIn={() => to(0.975)}
      onPressOut={() => to(1)}
      style={[full && styles.buttonFull, style]}>
      <Animated.View
        style={[
          styles.button,
          { backgroundColor: background },
          (isPrimary || isSuccess) && Shadow.primary,
          variant === 'outline' && styles.buttonOutline,
          isGhost && styles.buttonGhost,
          size === 'lg' && styles.buttonLarge,
          inactive && styles.buttonInactive,
          { transform: [{ scale }] },
        ]}>
        {loading ? (
          <ActivityIndicator color={color} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={size === 'lg' ? 21 : 19} color={color} /> : null}
            <Text style={[styles.buttonText, size === 'lg' && styles.buttonTextLarge, { color }]}>
              {title}
            </Text>
            {arrow ? <Ionicons name="arrow-forward" size={19} color={color} /> : null}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  variant?: 'surface' | 'outline' | 'dark' | 'primary';
  size?: number;
  disabled?: boolean;
  style?: ViewProps['style'];
  accessibilityLabel?: string;
}

export function IconButton({
  icon,
  onPress,
  variant = 'surface',
  size = Sizes.iconButton,
  disabled = false,
  style,
  accessibilityLabel,
}: IconButtonProps) {
  const isDark = variant === 'dark';
  const isPrimary = variant === 'primary';

  return (
    <PressableScale onPress={onPress} disabled={disabled} accessibilityLabel={accessibilityLabel} scaleTo={0.9}>
      <View
        style={[
          styles.iconButton,
          { width: size, height: size, borderRadius: size / 2 },
          variant === 'surface' && styles.iconButtonSurface,
          variant === 'outline' && styles.iconButtonOutline,
          isDark && styles.iconButtonDark,
          isPrimary && { backgroundColor: Colors.primary },
          disabled && styles.buttonInactive,
          style,
        ]}>
        <Ionicons
          name={icon}
          size={size * 0.46}
          color={isDark || isPrimary ? Colors.onPrimary : Colors.text}
        />
      </View>
    </PressableScale>
  );
}

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
  elevated?: boolean;
}

export function Card({ children, style, padded = true, elevated = false, ...rest }: CardProps) {
  return (
    <View
      style={[styles.card, padded && styles.cardPadded, elevated && Shadow.card, style]}
      {...rest}>
      {children}
    </View>
  );
}

interface TextFieldProps extends TextInputProps {
  label?: string;
  icon?: IconName;
  right?: React.ReactNode;
  hint?: string;
  error?: string;
}

export function TextField({ label, icon, right, hint, error, style, ...rest }: TextFieldProps) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
        {icon ? <Ionicons name={icon} size={19} color={Colors.textMuted} style={styles.inputIcon} /> : null}
        <TextInput placeholderTextColor={Colors.textMuted} style={[styles.input, style]} {...rest} />
        {right}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      {!error && hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

interface BadgeProps {
  label: string;
  color?: string;
  background?: string;
  icon?: IconName;
  size?: 'sm' | 'md';
}

export function Badge({
  label,
  color = Colors.primary,
  background = Colors.primaryLight,
  icon,
  size = 'sm',
}: BadgeProps) {
  return (
    <View style={[styles.badge, size === 'md' && styles.badgeMd, { backgroundColor: background }]}>
      {icon ? <Ionicons name={icon} size={size === 'md' ? 14 : 12} color={color} /> : null}
      <Text style={[styles.badgeText, size === 'md' && styles.badgeTextMd, { color }]}>{label}</Text>
    </View>
  );
}

/** Thin rounded progress meter with a smooth width animation. */
export function ProgressBar({
  value,
  max = 1,
  color = Colors.primary,
  track = Colors.surfaceSecondary,
  height = Sizes.progressHeight,
  style,
}: {
  value: number;
  max?: number;
  color?: string;
  track?: string;
  height?: number;
  style?: ViewProps['style'];
}) {
  const ratio = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: ratio,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [ratio, progress]);

  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }, style]}>
      <Animated.View
        style={{
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color,
          width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: IconName;
  color?: string;
  background?: string;
  sub?: string;
}

export function StatCard({ label, value, icon, color = Colors.primary, background = Colors.primaryLight, sub }: StatCardProps) {
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: background }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
        {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      </View>
    </Card>
  );
}

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <FadeInView style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={36} color={Colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
      {action ? <View style={{ marginTop: Spacing.sm }}>{action}</View> : null}
    </FadeInView>
  );
}

interface ScreenProps extends ScrollViewProps {
  children: React.ReactNode;
  padded?: boolean;
  /** Sticky content rendered above the scroll area. */
  header?: React.ReactNode;
  /** Sticky content rendered below the scroll area (e.g. primary CTA). */
  footer?: React.ReactNode;
}

export function Screen({
  children,
  padded = true,
  header,
  footer,
  contentContainerStyle,
  style,
  ...rest
}: ScreenProps) {
  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}
    >
      {header}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[padded && styles.screenContent, contentContainerStyle]}
          style={style}
          {...rest}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
      {footer ? <View style={styles.screenFooter}>{footer}</View> : null}
    </SafeAreaView>
  );
}

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Removes the default top gap, e.g. for the first section under a header. */
  flush?: boolean;
}

export function SectionTitle({ title, subtitle, action, flush = false }: SectionTitleProps) {
  return (
    <View style={[styles.sectionTitleRow, flush && { marginTop: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function Avatar({
  name,
  size = Sizes.avatarSm,
  background = Colors.primaryLight,
  color = Colors.primary,
  icon,
}: {
  name?: string;
  size?: number;
  background?: string;
  color?: string;
  icon?: IconName;
}) {
  const initials = (name ?? '')
    .trim()
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
      ]}>
      {icon ? (
        <Ionicons name={icon} size={size * 0.42} color={color} />
      ) : (
        <Text style={[styles.avatarText, { fontSize: size * 0.36, color }]}>{initials || '?'}</Text>
      )}
    </View>
  );
}

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  left?: React.ReactNode;
  /** Large screen-title treatment used on top-level tab screens. */
  large?: boolean;
  style?: ViewProps['style'];
}

/** Sticky screen header: optional back button, title block and right slot. */
export function AppHeader({
  title,
  subtitle,
  onBack,
  right,
  left,
  large = false,
  style,
}: AppHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      {onBack ? (
        <IconButton
          icon="chevron-back"
          variant="surface"
          onPress={onBack}
          accessibilityLabel="Go back"
          style={{ marginRight: Spacing.md }}
        />
      ) : null}
      {left}
      <View style={styles.headerText}>
        <Text style={[styles.headerTitle, large && styles.headerTitleLarge]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

interface ShiftCardProps {
  name: string;
  icon: IconName;
  present: number;
  total: number;
  accent?: string;
  accentSoft?: string;
  footnote?: string;
  onPress?: () => void;
  style?: ViewProps['style'];
}

/** Compact shift summary tile used side-by-side on the dashboard. */
export function ShiftCard({
  name,
  icon,
  present,
  total,
  accent = Colors.primary,
  accentSoft = Colors.primaryLight,
  footnote,
  onPress,
  style,
}: ShiftCardProps) {
  const percent = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <PressableScale onPress={onPress} disabled={!onPress} scaleTo={0.98} style={style}>
      <Card style={styles.shiftCard}>
        <View style={styles.rowBetween}>
          <View style={[styles.shiftIcon, { backgroundColor: accentSoft }]}>
            <Ionicons name={icon} size={20} color={accent} />
          </View>
          <Badge label={`${percent}%`} color={accent} background={accentSoft} />
        </View>
        <Text style={styles.shiftName}>{name}</Text>
        <Text style={styles.shiftMeta}>
          {present} / {total} Present
        </Text>
        <ProgressBar value={present} max={total} color={accent} style={{ marginTop: Spacing.md }} />
        {footnote ? <Text style={styles.shiftFootnote}>{footnote}</Text> : null}
      </Card>
    </PressableScale>
  );
}

interface ShiftOptionProps {
  name: string;
  icon: IconName;
  present: number;
  total: number;
  selected: boolean;
  onPress: () => void;
  accent?: string;
  accentSoft?: string;
}

/** Full-width selectable shift row used on the Select Shift screen. */
export function ShiftOption({
  name,
  icon,
  present,
  total,
  selected,
  onPress,
  accent = Colors.primary,
  accentSoft = Colors.primaryLight,
}: ShiftOptionProps) {
  const percent = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <PressableScale onPress={onPress} scaleTo={0.98}>
      <View style={[styles.shiftOption, selected && styles.shiftOptionSelected]}>
        <View style={styles.shiftOptionTop}>
          <View style={[styles.shiftOptionIcon, { backgroundColor: accentSoft }]}>
            <Ionicons name={icon} size={24} color={accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shiftOptionName}>{name}</Text>
            <Text style={styles.shiftOptionMeta}>
              {present} / {total} Present
            </Text>
          </View>
          <Ionicons
            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
            size={26}
            color={selected ? Colors.primary : Colors.borderStrong}
          />
        </View>
        <View style={styles.shiftOptionProgress}>
          <ProgressBar value={present} max={total} color={accent} style={{ flex: 1 }} />
          <Text style={[styles.shiftOptionPercent, { color: accent }]}>{percent}%</Text>
        </View>
      </View>
    </PressableScale>
  );
}

interface AttendanceRowProps {
  name: string;
  subtitle?: string;
  time?: string;
  badge?: { label: string; color?: string; background?: string };
  leadingIcon?: IconName;
  leadingIconColor?: string;
  leadingIconBackground?: string;
  onPress?: () => void;
  divider?: boolean;
}

/** Worker row used in attendance and worker lists. */
export function AttendanceRow({
  name,
  subtitle,
  time,
  badge,
  leadingIcon,
  leadingIconColor = Colors.success,
  leadingIconBackground = Colors.successLight,
  onPress,
  divider = true,
}: AttendanceRowProps) {
  const content = (
    <View style={[styles.attendanceRow, divider && styles.attendanceRowDivider]}>
      {leadingIcon ? (
        <Avatar
          icon={leadingIcon}
          size={Sizes.avatarSm}
          background={leadingIconBackground}
          color={leadingIconColor}
        />
      ) : (
        <Avatar name={name} size={Sizes.avatarSm} />
      )}
      <View style={styles.attendanceRowBody}>
        <Text style={styles.attendanceRowName} numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text style={styles.attendanceRowSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.attendanceRowRight}>
        {time ? <Text style={styles.attendanceRowTime}>{time}</Text> : null}
        {badge ? (
          <Badge
            label={badge.label}
            color={badge.color ?? Colors.primary}
            background={badge.background ?? Colors.primaryLight}
          />
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return content;
  return (
    <PressableScale onPress={onPress} scaleTo={0.99}>
      {content}
    </PressableScale>
  );
}

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  right?: React.ReactNode;
  style?: ViewProps['style'];
}

export function SearchBar({ value, onChangeText, placeholder = 'Search', right, style }: SearchBarProps) {
  return (
    <View style={[styles.searchRow, style]}>
      <View style={styles.searchField}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {value.length > 0 ? (
          <Pressable onPress={() => onChangeText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {right}
    </View>
  );
}

interface FilterChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: IconName;
}

export function FilterChip({ label, active = false, onPress, icon }: FilterChipProps) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.94}>
      <View style={[styles.chip, active && styles.chipActive]}>
        {icon ? (
          <Ionicons name={icon} size={14} color={active ? Colors.onPrimary : Colors.textSecondary} />
        ) : null}
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      </View>
    </PressableScale>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  icon?: IconName;
  valueColor?: string;
  dot?: string;
  last?: boolean;
}

/** Label/value row used inside detail cards. */
export function DetailRow({
  label,
  value,
  icon,
  valueColor = Colors.text,
  dot,
  last = false,
}: DetailRowProps) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowDivider]}>
      <View style={styles.detailLabelWrap}>
        {icon ? <Ionicons name={icon} size={17} color={Colors.textMuted} /> : null}
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <View style={styles.detailValueWrap}>
        {dot ? <View style={[styles.detailDot, { backgroundColor: dot }]} /> : null}
        <Text style={[styles.detailValue, { color: valueColor }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

type HeroTone = 'success' | 'warning' | 'danger' | 'primary';

const HERO_TONES: Record<HeroTone, { solid: string; soft: string; icon: IconName }> = {
  success: { solid: Colors.success, soft: Colors.successLight, icon: 'checkmark' },
  warning: { solid: Colors.warning, soft: Colors.warningLight, icon: 'alert' },
  danger: { solid: Colors.danger, soft: Colors.dangerLight, icon: 'close' },
  primary: { solid: Colors.primary, soft: Colors.primaryLight, icon: 'qr-code' },
};

/** Big circular status badge with title + message, used for scan outcomes. */
export function StatusHero({
  tone,
  title,
  message,
  icon,
  color,
  children,
}: {
  tone: HeroTone;
  title: string;
  message?: string;
  icon?: IconName;
  color?: string;
  children?: React.ReactNode;
}) {
  const palette = HERO_TONES[tone];

  return (
    <FadeInView style={styles.hero}>
      <View style={[styles.heroRing, { backgroundColor: palette.soft }]}>
        <View style={[styles.heroCircle, { backgroundColor: palette.solid }]}>
          <Ionicons name={icon ?? palette.icon} size={44} color={Colors.onPrimary} />
        </View>
      </View>
      <Text style={[styles.heroTitle, { color: color ?? palette.solid }]}>{title}</Text>
      {message ? <Text style={styles.heroMessage}>{message}</Text> : null}
      {children}
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  screenFooter: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  brandMark: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    ...Shadow.primary,
  },
  buttonFull: {
    alignSelf: 'stretch',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    minHeight: Sizes.buttonHeight,
  },
  buttonLarge: {
    minHeight: Sizes.buttonHeightLg,
    borderRadius: Radius.md,
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.card,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonInactive: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    letterSpacing: 0.1,
  },
  buttonTextLarge: {
    fontSize: FontSizes.section,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonSurface: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
  },
  iconButtonDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardPadded: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FontSizes.section,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  headerTitleLarge: {
    fontSize: FontSizes.title,
    fontWeight: FontWeights.heavy,
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },
  field: {
    gap: Spacing.xs + 2,
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
    marginLeft: Spacing.xxs,
  },
  fieldHint: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  fieldError: {
    fontSize: FontSizes.xs,
    color: Colors.danger,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  inputWrapError: {
    borderColor: Colors.danger,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.pill,
  },
  badgeMd: {
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
  },
  badgeTextMd: {
    fontSize: FontSizes.sm,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.heavy,
    color: Colors.text,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  statSub: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  emptyMessage: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: LineHeights.normal,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.section,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: FontWeights.bold,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shiftCard: {
    gap: Spacing.xxs,
  },
  shiftIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.bold,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  shiftMeta: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },
  shiftFootnote: {
    fontSize: FontSizes.micro,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },
  shiftOption: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  shiftOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  shiftOptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  shiftOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftOptionName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },
  shiftOptionMeta: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xxs,
  },
  shiftOptionProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  shiftOptionPercent: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    minWidth: 34,
    textAlign: 'right',
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  attendanceRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  attendanceRowBody: {
    flex: 1,
  },
  attendanceRowName: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  attendanceRowSub: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xxs,
  },
  attendanceRowRight: {
    alignItems: 'flex-end',
    gap: Spacing.xxs,
  },
  attendanceRowTime: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: Sizes.tapTarget,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.body,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.semibold,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.onPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  detailRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  detailValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  detailDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    textAlign: 'right',
  },
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  heroRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.primary,
  },
  heroTitle: {
    fontSize: FontSizes.title,
    fontWeight: FontWeights.heavy,
    textAlign: 'center',
    marginTop: Spacing.xl,
    letterSpacing: -0.3,
  },
  heroMessage: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: LineHeights.relaxed,
    maxWidth: 300,
  },
});