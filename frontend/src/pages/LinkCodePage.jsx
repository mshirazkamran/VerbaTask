import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { IconMail, IconKey, IconCheck, IconBrandWhatsapp } from '@tabler/icons-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';

const linkCodeSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  code: z
    .string()
    .min(1, 'Link code is required')
    .min(4, 'Code must be at least 4 digits'),
});

export function LinkCodePage() {
  const [loading, setLoading] = useState(false);
  const [linked, setLinked] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(linkCodeSchema),
    defaultValues: {
      email: '',
      code: '',
    },
  });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      const data = await api.post('/api/auth/link-code/confirm', {
        email: values.email,
        code: values.code.trim(),
      });

      if (data?.linked) {
        setLinked(true);
        toast.success('WhatsApp number linked successfully!');
      } else {
        toast.success('Code confirmed.');
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to verify link code. It may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Link WhatsApp number"
      subtitle="Enter your email and the verification code sent by the VerbaTask bot."
    >
      {linked ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <IconCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-medium text-ink">
              Number linked successfully!
            </h2>
            <p className="text-xs text-ink-mute">
              Your WhatsApp line is connected to your VerbaTask merchant account.
            </p>
          </div>
          <div className="pt-2">
            <Button onClick={() => navigate('/login')} className="w-full">
              Proceed to Sign in
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="p-3 rounded-lg bg-primary-subdued/20 border border-primary/20 flex items-start gap-2.5 text-xs text-ink-secondary">
            <IconBrandWhatsapp className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Send a message to the bot to receive a 15-minute code. If you already messaged the bot before signing up, reply <strong>link</strong> to get a fresh code.
            </span>
          </div>

          <Input
            label="Registered email address"
            id="link-email"
            type="email"
            autoComplete="email"
            placeholder="name@business.com"
            leftIcon={<IconMail className="w-4 h-4" />}
            error={errors.email?.message}
            required
            {...register('email')}
          />

          <Input
            label="Verification code"
            id="link-code"
            type="text"
            placeholder="e.g. 849201"
            leftIcon={<IconKey className="w-4 h-4" />}
            error={errors.code?.message}
            helperText="Codes expire after 15 minutes."
            required
            {...register('code')}
          />

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              rightIcon={<IconCheck className="w-4 h-4" />}
            >
              Verify & link number
            </Button>
          </div>

          <div className="pt-4 border-t border-hairline flex justify-center text-xs text-ink-mute">
            <Link
              to="/login"
              className="text-ink-secondary hover:text-primary transition-colors hover:underline"
            >
              Back to Sign in
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
