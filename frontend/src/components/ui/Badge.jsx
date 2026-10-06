/**
 * Status and tag badges styled per Stripe micro-cap pill specifications.
 */

export function Badge({
 children,
 variant = 'neutral',
 size = 'md',
 dot = false,
 shape = 'rounded',
 className = '',
 ...props
}) {
 const variantStyles = {
 neutral: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700',
 primary: 'bg-[#287A74]/15 text-[#287A74] dark:text-[#AEEED3] border border-[#287A74]/30',
 mint: 'bg-[#AEEED3]/25 text-[#174845] dark:text-[#AEEED3] border border-[#AEEED3]/50',
 butter: 'bg-[#FFF8B0]/40 text-[#4E4300] dark:text-[#FFF8B0] border border-[#FFF8B0]/60',
 success: 'bg-[#AEEED3]/25 text-[#174845] dark:text-[#AEEED3] border border-[#AEEED3]/50',
 completed: 'bg-[#AEEED3]/25 text-[#174845] dark:text-[#AEEED3] border border-[#AEEED3]/50',
 approved: 'bg-[#AEEED3]/25 text-[#174845] dark:text-[#AEEED3] border border-[#AEEED3]/50',
 warning: 'bg-[#FFF8B0]/30 text-[#6B5A00] dark:text-[#FFF8B0] border border-[#FFF8B0]/50',
 pending: 'bg-[#FFF8B0]/30 text-[#6B5A00] dark:text-[#FFF8B0] border border-[#FFF8B0]/50',
 pending_approval: 'bg-[#FFF8B0]/35 text-[#6B5A00] dark:text-[#FFF8B0] border border-[#FFF8B0]/60',
 danger: 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/60',
 rejected: 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/60',
 voice: 'bg-[#55A9A0]/20 text-[#174845] dark:text-[#AEEED3] border border-[#55A9A0]/40',
 guided: 'bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
 dashboard: 'bg-[#287A74]/15 text-[#287A74] dark:text-[#AEEED3] border border-[#287A74]/30',
 };

 const dotColors = {
 neutral: 'bg-zinc-400',
 primary: 'bg-[#287A74] dark:bg-[#AEEED3]',
 mint: 'bg-[#287A74] dark:bg-[#AEEED3]',
 butter: 'bg-[#8A7800] dark:bg-[#FFF8B0]',
 success: 'bg-[#287A74] dark:bg-[#AEEED3]',
 completed: 'bg-[#287A74] dark:bg-[#AEEED3]',
 approved: 'bg-[#287A74] dark:bg-[#AEEED3]',
 warning: 'bg-[#8A7800] dark:bg-[#FFF8B0]',
 pending: 'bg-[#8A7800] dark:bg-[#FFF8B0]',
 pending_approval: 'bg-[#8A7800] dark:bg-[#FFF8B0]',
 danger: 'bg-red-500',
 rejected: 'bg-red-500',
 voice: 'bg-[#55A9A0]',
 guided: 'bg-sky-500',
 dashboard: 'bg-[#287A74] dark:bg-[#AEEED3]',
 };

 const sizeStyles = {
 sm: 'text-[10px] px-1.5 py-0.5 gap-1',
 md: 'text-[11px] px-2 py-0.5 gap-1.5',
 lg: 'text-xs px-2.5 py-1 gap-1.5',
 };

 const shapeStyles = {
 rounded: 'rounded-md',
 pill: 'rounded-pill',
 square: 'rounded-xs',
 };

 return (
 <span
 className={`inline-flex items-center justify-center font-medium ${
 shapeStyles[shape] || 'rounded-md'
 } tracking-tight select-none ${
 sizeStyles[size] || sizeStyles.md
 } ${variantStyles[variant] || variantStyles.neutral} ${className}`}
 {...props}
 >
 {dot && (
 <span
 className={`w-1.5 h-1.5 rounded-full shrink-0 ${
 dotColors[variant] || dotColors.neutral
 }`}
 />
 )}
 <span>{children}</span>
 </span>
 );
}
