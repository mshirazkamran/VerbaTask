import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Key,
  Check,
} from 'lucide-react';
import { WhatsAppIcon } from '../components/ui/WhatsAppIcon';
import { AuthLayout } from '../components/layout/AuthLayout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { useUiStore } from '../lib/store';
import { getTranslations } from '../lib/translations';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const language = useUiStore((s) => s.language);
  const t = getTranslations(language).auth;

  // Flow states: 'request' (enter email/phone) | 'verify' (enter code & new password)
  const [step, setStep] = useState('request');
  const [identifier, setIdentifier] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const urlCode = searchParams.get('code');
    const urlIdentifier = searchParams.get('identifier');
    if (urlCode && urlCode.length === 6) {
      setCode(urlCode);
      if (urlIdentifier) setIdentifier(urlIdentifier);
      setStep('verify');
      toast.info('Verification code pre-filled from WhatsApp link');
    }
  }, [searchParams]);

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
      title={step === 'request' ? t.resetTitle : t.verifyTitle}
      subtitle={
        step === 'request'
          ? t.resetSubtitle
          : `${t.verifySubtitle} ${maskedPhone ? `(${maskedPhone})` : ''}`
      }
    >
      {step === 'request' ? (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <Input
            label={t.identifierLabel}
            id="reset-identifier"
            type="text"
            placeholder={t.identifierPlaceholder}
            leftIcon={<Mail className="w-4 h-4" />}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
          />

          <div className="rounded-lg bg-surface/50 border border-hairline p-3 flex items-start gap-2.5 text-xs text-ink-secondary">
            <WhatsAppIcon className="w-4 h-4 text-success-ink shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-ink">{t.whatsappDelivery}</p>
              <p className="text-ink-mute mt-0.5">
                {t.whatsappDeliveryDesc}
              </p>
              <p className="text-ink-mute mt-1 text-[11px]">
                {t.rateLimitHint}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              rightIcon={<ArrowRight className="w-4 h-4 rtl:rotate-180" />}
            >
              {t.sendCodeBtn}
            </Button>
          </div>

          <div className="pt-4 border-t border-hairline flex justify-center text-xs text-ink-mute">
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-ink-secondary hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              {t.backToSignIn}
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            label={t.codeLabel}
            id="reset-code"
            type="text"
            placeholder="123456"
            maxLength={6}
            leftIcon={<Key className="w-4 h-4" />}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            autoFocus
          />

          <Input
            label={t.newPasswordLabel}
            id="reset-new-password"
            type="password"
            placeholder="At least 6 characters"
            leftIcon={<Lock className="w-4 h-4" />}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />

          <Input
            label={t.confirmPasswordLabel}
            id="reset-confirm-password"
            type="password"
            placeholder="Repeat new password"
            leftIcon={<Lock className="w-4 h-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-ink-mute">
              {remainingAttempts > 0 ? (
                `${remainingAttempts} request${remainingAttempts === 1 ? '' : 's'} remaining this hour`
              ) : (
                <span className="text-warn-ink">Hourly limit reached</span>
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
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              {cooldown > 0 ? `${t.resendIn} ${cooldown}s` : t.resendCode}
            </button>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              loading={loading}
              rightIcon={<Check className="w-4 h-4" />}
            >
              {t.resetPasswordBtn}
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
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              {t.changeIdentifier}
            </button>

            <Link
              to="/login"
              className="text-primary hover:underline"
            >
              {t.backToSignIn}
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
