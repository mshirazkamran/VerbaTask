import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  IconMail,
  IconLock,
  IconArrowRight,
  IconArrowLeft,
  IconBrandWhatsapp,
  IconRefresh,
  IconKey,
  IconCheck,
} from '@tabler/icons-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  // Flow states: 'request' (enter email/phone) | 'verify' (enter code & new password)
  const [step, setStep] = useState('request');
  const [identifier, setIdentifier] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Request Code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error('Please enter your email or WhatsApp number');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/api/auth/forgot-password/request', { identifier: identifier.trim() });
      setMaskedPhone(data.whatsappMasked || '');
      setRemainingAttempts(data.remainingAttempts ?? 2);
      setStep('verify');
      setCooldown(60); // 60-second cooldown
      toast.success('Verification code sent to your WhatsApp!');
    } catch (err) {
      toast.error(err.message || 'Failed to request password reset code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend Code
  const handleResendCode = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    try {
      const data = await api.post('/api/auth/forgot-password/resend', { identifier: identifier.trim() });
      setRemainingAttempts(data.remainingAttempts ?? remainingAttempts - 1);
      setCooldown(60);
      toast.success('A new verification code has been sent to your WhatsApp!');
    } catch (err) {
      toast.error(err.message || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!code.trim() || code.trim().length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password/reset', {
        identifier: identifier.trim(),
        code: code.trim(),
        newPassword,
      });

      toast.success('Password has been reset successfully! Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to reset password. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={step === 'request' ? 'Reset your password' : 'Enter verification code'}
      subtitle={
        step === 'request'
          ? 'Enter your registered email or WhatsApp number to receive a secure reset code.'
          : `We sent a 6-digit code to your WhatsApp ${maskedPhone ? `(${maskedPhone})` : ''}.`
      }
    >
      {step === 'request' ? (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <Input
            label="Email or WhatsApp number"
            id="reset-identifier"
            type="text"
            placeholder="name@business.com or 03001234567"
            leftIcon={<IconMail className="w-4 h-4" />}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
          />

          <div className="rounded-lg bg-surface/50 border border-hairline p-3 flex items-start gap-2.5 text-xs text-ink-secondary">
            <IconBrandWhatsapp className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-ink">WhatsApp Delivery</p>
              <p className="text-ink-mute mt-0.5">
                The verification code will be sent to the WhatsApp number registered with your account.
              </p>
              <p className="text-ink-mute mt-1 text-[11px]">
                Rate limit: Up to 3 code requests per hour.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              rightIcon={<IconArrowRight className="w-4 h-4" />}
            >
              Send WhatsApp Code
            </Button>
          </div>

          <div className="pt-4 border-t border-hairline flex justify-center text-xs text-ink-mute">
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-ink-secondary hover:text-primary transition-colors"
            >
              <IconArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            label="6-Digit WhatsApp Code"
            id="reset-code"
            type="text"
            placeholder="123456"
            maxLength={6}
            leftIcon={<IconKey className="w-4 h-4" />}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            autoFocus
          />

          <Input
            label="New password"
            id="reset-new-password"
            type="password"
            placeholder="At least 6 characters"
            leftIcon={<IconLock className="w-4 h-4" />}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label="Confirm new password"
            id="reset-confirm-password"
            type="password"
            placeholder="Repeat new password"
            leftIcon={<IconLock className="w-4 h-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-ink-mute">
              {remainingAttempts > 0 ? (
                `${remainingAttempts} request${remainingAttempts === 1 ? '' : 's'} remaining this hour`
              ) : (
                <span className="text-amber-500">Hourly limit reached</span>
              )}
            </span>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={cooldown > 0 || resending || remainingAttempts <= 0}
              className={`flex items-center gap-1 font-medium transition-colors ${
                cooldown > 0 || remainingAttempts <= 0
                  ? 'text-ink-mute cursor-not-allowed'
                  : 'text-primary hover:underline cursor-pointer'
              }`}
            >
              <IconRefresh className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              rightIcon={<IconCheck className="w-4 h-4" />}
            >
              Reset Password
            </Button>
          </div>

          <div className="pt-4 border-t border-hairline flex items-center justify-between text-xs text-ink-mute">
            <button
              type="button"
              onClick={() => {
                setStep('request');
                setCode('');
              }}
              className="flex items-center gap-1.5 text-ink-secondary hover:text-primary transition-colors cursor-pointer"
            >
              <IconArrowLeft className="w-3.5 h-3.5" />
              Change email / phone
            </button>

            <Link
              to="/login"
              className="text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
export default ForgotPasswordPage;
