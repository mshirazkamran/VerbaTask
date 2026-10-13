import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { DemoAccountCard } from '../components/DemoAccountCard';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { useAuthStore, useUiStore } from '../lib/store';
import { getTranslations } from '../lib/translations';

const signupSchema = z
  .object({
    email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export function SignupPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const language = useUiStore((s) => s.language);
  const t = getTranslations(language).auth;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/signup', {
        email: values.email,
        password: values.password,
      });
      setAuth(data.token, data.merchantId);
      toast.success('Account created. Now link your WhatsApp number');
      navigate('/link-code', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t.signupTitle}
      subtitle={t.signupSubtitle}
    >
      <DemoAccountCard />

      <div className="relative flex items-center justify-center my-4">
        <div className="border-t border-hairline w-full" />
        <span className="bg-surface px-3 text-[11px] uppercase tracking-wider text-ink-mute font-medium absolute">
          {language === 'ur' ? 'یا نیا اکاؤنٹ رجسٹر کریں' : 'Or create a new account'}
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label={t.emailLabel}
          id="signup-email"
          type="email"
          autoComplete="email"
          placeholder="name@business.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          required
          {...register('email')}
        />

        <Input
          label={t.passwordLabel}
          id="signup-password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.password?.message}
          required
          {...register('password')}
        />

        <Input
          label={t.confirmPassword}
          id="signup-confirm-password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.confirmPassword?.message}
          required
          {...register('confirmPassword')}
        />

        <div className="pt-2">
          <Button
            type="submit"
            className="w-full"
            loading={loading}
            rightIcon={<ArrowRight className="w-4 h-4 rtl:rotate-180" />}
          >
            {t.createAccountBtn}
          </Button>
        </div>

        <div className="pt-4 border-t border-hairline flex flex-col items-center gap-2 text-xs text-ink-mute">
          <p>
            {t.hasAccount}{' '}
            <Link
              to="/login"
              className="text-primary font-medium hover:underline focus:outline-none"
            >
              {t.signInBtn}
            </Link>
          </p>
          <p>
            {language === 'ur' ? 'واٹس ایپ لنک کوڈ پہلے سے ہے؟' : 'Linking an existing phone number?'}{' '}
            <Link
              to="/link-code"
              className="text-ink-secondary hover:text-primary transition-colors hover:underline"
            >
              {language === 'ur' ? 'واٹس ایپ کوڈ درج کریں' : 'Enter WhatsApp code'}
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}

export default SignupPage;
