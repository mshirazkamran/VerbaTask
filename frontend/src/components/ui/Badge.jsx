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
 neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700',
 primary: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
 success: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
 completed: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
 approved: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
 warning: 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
 pending: 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
 pending_approval: 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
 danger: 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800',
 rejected: 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800',
 voice: 'bg-purple-50 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
 guided: 'bg-sky-50 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
 dashboard: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
 };

 const dotColors = {
 neutral: 'bg-slate-500',
 primary: 'bg-emerald-500',
 success: 'bg-emerald-500',
 completed: 'bg-emerald-500',
 approved: 'bg-emerald-500',
 warning: 'bg-amber-500',
 pending: 'bg-amber-500',
 pending_approval: 'bg-amber-500',
 danger: 'bg-red-500',
 rejected: 'bg-red-500',
 voice: 'bg-purple-500',
 guided: 'bg-sky-500',
 dashboard: 'bg-emerald-500',
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
