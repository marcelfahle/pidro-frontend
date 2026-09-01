import { View, ViewProps, TextProps, StyleSheet } from 'react-native';
import { cn } from '@/utils/cn';
import { PidroSpacing } from '@/design/tokens';
import { PidroText } from './PidroText';
import { Surface } from './Surface';

export interface CardProps extends ViewProps {
  className?: string;
}

export interface CardTitleProps extends Omit<TextProps, 'role'> {
  className?: string;
}

export function Card({ className, ...props }: CardProps) {
  return <Surface variant="card" style={styles.card} className={cn(className)} {...props} />;
}

export function CardHeader({ className, ...props }: CardProps) {
  return <View style={styles.header} className={cn(className)} {...props} />;
}

export function CardTitle({ className, ...props }: CardTitleProps) {
  return <PidroText role="title" style={styles.title} className={cn(className)} {...props} />;
}

export function CardContent({ className, ...props }: CardProps) {
  return <View style={styles.content} className={cn(className)} {...props} />;
}

export function CardFooter({ className, ...props }: CardProps) {
  return <View style={styles.footer} className={cn(className)} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  header: {
    paddingHorizontal: PidroSpacing.md,
    paddingTop: PidroSpacing.md,
    paddingBottom: PidroSpacing.xs,
  },
  title: {},
  content: {
    paddingHorizontal: PidroSpacing.md,
    paddingBottom: PidroSpacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    paddingHorizontal: PidroSpacing.md,
    paddingBottom: PidroSpacing.md,
  },
});
