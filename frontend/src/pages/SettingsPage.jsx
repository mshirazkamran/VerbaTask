import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Store,
  CreditCard,
  Mic,
  Check,
  Smartphone,
  RefreshCw,
  Pencil,
  Key,
  X,
  ArrowRight,
  Zap,
  Users,
  Copy,
  UserPlus,
  Trash2,
  Share2,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { WhatsAppIcon } from '../components/ui/WhatsAppIcon';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import {
  useMerchantProfile,
  useUpdateMerchantProfile,
  usePaymentMethods,
  useUpdatePaymentMethods,
  useRequestPhoneChange,
  useVerifyPhoneChange,
  useResendPhoneChangeCode,
  useStaffMembers,
  useAddStaffMember,
  useRemoveStaffMember,
  useRegenerateShopCode,
} from '../hooks/useMerchantSettings';
import { useUiStore } from '../lib/store';

const getBusinessTypes = (isUrdu) => [
  { value: 'kiryana', label: isUrdu ? 'کریانہ / جنرل اسٹور' : 'Kiryana / Grocery Store' },
  { value: 'clothing', label: isUrdu ? 'کپڑے / بوتیک' : 'Clothing & Apparel / Boutique' },
  { value: 'medical', label: isUrdu ? 'میڈیکل اسٹور / فارمیسی' : 'Pharmacy / Medical Store' },
  { value: 'electronics', label: isUrdu ? 'الیکٹرانکس و موبائل' : 'Electronics & Mobile Accessories' },
  { value: 'restaurant', label: isUrdu ? 'ریسٹورنٹ / کیفے / ہوٹل' : 'Restaurant / Cafe / Dhaba' },
  { value: 'general', label: isUrdu ? 'عام ریٹیل دکان' : 'General Retail Store' },
  { value: 'auto', label: isUrdu ? 'آٹو پارٹس و ورکشاپ' : 'Auto Spare Parts & Workshop' },
  { value: 'salon', label: isUrdu ? 'سیلون و کاسمیٹکس' : 'Salon & Cosmetics' },
  { value: 'services', label: isUrdu ? 'سروسز و دیگر کاروبار' : 'Services & Trade' },
];

export function SettingsPage() {
  const uiLanguage = useUiStore((s) => s.language);
  const isUrdu = uiLanguage === 'ur';

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'voice' | 'payments'

  const { data: profile, isLoading: profileLoading } = useMerchantProfile();
  const updateProfileMutation = useUpdateMerchantProfile();

  const { data: paymentMethodsData, isLoading: paymentsLoading } = usePaymentMethods();
  const updatePaymentsMutation = useUpdatePaymentMethods();

  const requestPhoneChangeMutation = useRequestPhoneChange();
  const verifyPhoneChangeMutation = useVerifyPhoneChange();
  const resendPhoneCodeMutation = useResendPhoneChangeCode();

  // Team & Staff State & Mutations
  const { data: staffData, isLoading: staffLoading } = useStaffMembers();
  const addStaffMutation = useAddStaffMember();
  const removeStaffMutation = useRemoveStaffMember();
  const regenerateCodeMutation = useRegenerateShopCode();

  const [staffNameInput, setStaffNameInput] = useState('');
  const [staffPhoneInput, setStaffPhoneInput] = useState('');
  const [isAddingStaff, setIsAddingStaff] = useState(false);

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success(`Shop code ${code} copied to clipboard!`);
  };

  const handleShareInvite = (code) => {
    if (!code) return;
    const msg = `As-salamu alaykum! Join our shop account on VerbaTask by sending: join ${code} [Your Name]`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!staffNameInput.trim()) {
      toast.error('Please enter the staff member name');
      return;
    }
    if (!staffPhoneInput.trim()) {
      toast.error('Please enter the staff member WhatsApp number');
      return;
    }

    try {
      setIsAddingStaff(true);
      await addStaffMutation.mutateAsync({
        name: staffNameInput.trim(),
        whatsappNumber: staffPhoneInput.trim(),
      });
      toast.success(`${staffNameInput.trim()} added to your shop staff!`);
      setStaffNameInput('');
      setStaffPhoneInput('');
    } catch (err) {
      toast.error(err.message || 'Failed to add staff member');
    } finally {
      setIsAddingStaff(false);
    }
  };

  const handleRemoveStaff = async (staffId, name) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your store team?`)) {
      return;
    }
    try {
      await removeStaffMutation.mutateAsync(staffId);
      toast.success(`${name} removed from store team`);
    } catch (err) {
      toast.error(err.message || 'Failed to remove staff member');
    }
  };

  const handleRegenerateCode = async () => {
    if (!window.confirm('Regenerate Shop Code? Existing staff remain connected, but new staff will need to use the new code.')) {
      return;
    }
    try {
      const res = await regenerateCodeMutation.mutateAsync();
      toast.success(`New Shop Code generated: ${res.shopCode}`);
    } catch (err) {
      toast.error(err.message || 'Failed to regenerate code');
    }
  };

  // Store Profile State
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('general');
  const [location, setLocation] = useState('');
  const [sells, setSells] = useState('');

  // Phone Number Change Flow State
  const [isChangingPhone, setIsChangingPhone] = useState(false);
  const [phoneStep, setPhoneStep] = useState('input'); // 'input' | 'otp'
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneCooldown, setPhoneCooldown] = useState(0);
  const [maskedNewPhone, setMaskedNewPhone] = useState('');
  const [phoneRemainingAttempts, setPhoneRemainingAttempts] = useState(3);

  // Phone cooldown timer
  useEffect(() => {
    if (phoneCooldown <= 0) return;
    const timer = setInterval(() => {
      setPhoneCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phoneCooldown]);

  // Voice & Language State
  const [language, setLanguage] = useState('ur');
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [replyPreference, setReplyPreference] = useState('voice_on_voice');
  const [confirmAutomations, setConfirmAutomations] = useState(false);

  // Payments State
  const [activePaymentIds, setActivePaymentIds] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState({});
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('cash');

  // Sync profile data to state
  useEffect(() => {
    if (profile) {
      setBusinessName(profile.businessName || '');
      setBusinessType(profile.businessType || 'general');
      setLocation(profile.location || '');
      setSells(profile.sells || '');
      setLanguage(profile.language || 'ur');
      setVoiceReplies(profile.voiceReplies ?? true);
      setReplyPreference(profile.replyPreference || 'voice_on_voice');
      setConfirmAutomations(profile.confirmAutomations ?? false);
    }
  }, [profile]);

  // Sync payment methods to state
  useEffect(() => {
    if (paymentMethodsData?.activeMethods) {
      setActivePaymentIds(paymentMethodsData.activeMethods);
    }
    if (profile?.paymentDetails) {
      setPaymentDetails(profile.paymentDetails);
    }
    if (paymentMethodsData?.defaultPaymentMethod) {
      setDefaultPaymentMethod(paymentMethodsData.defaultPaymentMethod);
    }
  }, [paymentMethodsData, profile]);

  // Handle Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await updateProfileMutation.mutateAsync({
        businessName: businessName.trim(),
        businessType,
        location: location.trim(),
        sells: sells.trim(),
      });
      toast.success('Store profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update store profile');
    }
  };

  // Phone Change Handlers
  const handleRequestPhoneChange = async (e) => {
    e?.preventDefault();
    if (!newPhoneNumber.trim()) {
      toast.error('Please enter your new WhatsApp number');
      return;
    }

    try {
      const res = await requestPhoneChangeMutation.mutateAsync(newPhoneNumber.trim());
      setMaskedNewPhone(res.maskedNumber || '');
      setPhoneRemainingAttempts(res.remainingAttempts ?? 2);
      setPhoneStep('otp');
      setPhoneCooldown(60);
      toast.success('Verification OTP sent to your new WhatsApp number!');
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP to new number');
    }
  };

  const handleVerifyPhoneChange = async (e) => {
    e?.preventDefault();
    if (!phoneOtp.trim() || phoneOtp.trim().length !== 6) {
      toast.error('Please enter the 6-digit OTP code');
      return;
    }

    try {
      await verifyPhoneChangeMutation.mutateAsync({
        newPhoneNumber: newPhoneNumber.trim(),
        code: phoneOtp.trim(),
      });
      toast.success('WhatsApp phone number successfully updated and activated!');
      setIsChangingPhone(false);
      setPhoneStep('input');
      setNewPhoneNumber('');
      setPhoneOtp('');
    } catch (err) {
      toast.error(err.message || 'Failed to verify OTP code');
    }
  };

  const handleResendPhoneOtp = async () => {
    if (phoneCooldown > 0 || resendPhoneCodeMutation.isPending) return;
    try {
      const res = await resendPhoneCodeMutation.mutateAsync(newPhoneNumber.trim());
      setPhoneRemainingAttempts(res.remainingAttempts ?? phoneRemainingAttempts - 1);
      setPhoneCooldown(60);
      toast.success('New OTP sent to your new WhatsApp number!');
    } catch (err) {
      toast.error(err.message || 'Failed to resend OTP');
    }
  };

  // Handle Voice Settings Save
  const handleSaveVoice = async (e) => {
    e.preventDefault();
    try {
      await updateProfileMutation.mutateAsync({
        language,
        voiceReplies,
        replyPreference,
        confirmAutomations,
      });
      toast.success('Bot preferences updated!');
    } catch (err) {
      toast.error(err.message || 'Failed to update voice preferences');
    }
  };

  // Toggle Payment Method Active State
  const togglePaymentMethod = (id) => {
    if (id === 'cash') {
      toast.info('Cash is a fundamental payment method and stays active.');
      return;
    }
    setActivePaymentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handle Payment Detail Input Change (e.g. Account Title or IBAN)
  const handlePaymentDetailChange = (id, field, value) => {
    setPaymentDetails((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }));
  };

  // Handle Payments Save
  const handleSavePayments = async () => {
    try {
      await updatePaymentsMutation.mutateAsync({
        acceptedPaymentMethods: activePaymentIds,
        paymentDetails,
        defaultPaymentMethod,
      });
      toast.success('Accepted payment methods updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update payment channels');
    }
  };

  if (profileLoading || paymentsLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const allMethods = paymentMethodsData?.methods || [];
  const walletMethods = allMethods.filter((m) => ['wallet', 'emi', 'instant'].includes(m.category));
  const bankMethods = allMethods.filter((m) => m.category === 'bank');
  const cashMethods = allMethods.filter((m) => m.category === 'cash');

  return (
    <div className="space-y-5 pb-12 sm:space-y-6">
      <div>
        <p className="label">{isUrdu ? 'آپ کی دکان' : 'Your shop'}</p>
        <h1 className={`display mt-2 text-[length:var(--fs-xl)] text-ink sm:text-[length:var(--fs-2xl)] ${isUrdu ? 'font-urdu text-3xl sm:text-4xl' : ''}`}>
          {profile?.businessName || (isUrdu ? 'دکان کی سیٹنگز' : 'Shop settings')}
        </h1>
      </div>

      {/* 3/9 — a vertical section rail beside the form */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-8">
        <nav
          aria-label="Settings sections"
          className="custom-scrollbar flex gap-1 overflow-x-auto lg:sticky lg:top-24 lg:col-span-3 lg:flex-col lg:self-start lg:overflow-visible"
        >
          {[
            { id: 'profile', label: isUrdu ? 'دکان کا پروفائل' : 'Shop profile', hint: isUrdu ? 'نام، پتہ، سامان' : 'Name, area, what you sell', icon: Store },
            { id: 'team', label: isUrdu ? 'ٹیم اور ملازمین' : 'Team & Staff', hint: isUrdu ? `${staffData?.activeCount ?? profile?.staffMembers?.length ?? 0} منسلک` : `${staffData?.activeCount ?? profile?.staffMembers?.length ?? 0} connected (Pro)`, icon: Users },
            { id: 'payments', label: isUrdu ? 'ادائیگی کے ذرائع' : 'Payments', hint: isUrdu ? `${activePaymentIds.length} فعال` : `${activePaymentIds.length} accepted`, icon: CreditCard },
            { id: 'voice', label: isUrdu ? 'آواز اور زبان' : 'Voice & language', hint: isUrdu ? 'بوٹ کس طرح بولے' : 'How the bot talks', icon: Mic },
          ].map((t) => {
            const on = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                aria-current={on ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-card px-4 py-3 text-left transition-colors duration-150 lg:w-full ${
                  on ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0">
                  <span className={`block whitespace-nowrap text-sm font-semibold ${isUrdu ? 'font-urdu text-base' : ''}`}>{t.label}</span>
                  <span className={`hidden truncate text-xs lg:block ${on ? 'opacity-70' : 'text-muted'}`}>{t.hint}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 lg:col-span-9">
      {/* Tab 1: Store Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-hairline">
              <div className="grid size-10 shrink-0 place-items-center rounded-pill bg-primary-tint text-primary-deep dark:text-primary">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`font-display text-lg font-semibold tracking-tight text-ink ${isUrdu ? 'font-urdu text-xl' : ''}`}>
                  {isUrdu ? 'دکان کی شناخت' : 'Store Identity'}
                </h2>
                <p className="text-xs text-ink-mute">
                  {isUrdu ? 'کاروبار کا نام تبدیل کریں اور پتہ و کاروباری شعبہ منتخب کریں۔' : 'Rename your business and specify your location and retail specialty.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label={isUrdu ? 'دکان / کاروبار کا نام' : 'Store / Business Name'}
                  id="settings-store-name"
                  placeholder={isUrdu ? 'مثلاً: خان کریانہ اسٹور' : 'e.g. Khan Kiryana & General Store'}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Select
                  label={isUrdu ? 'کاروباری شعبہ' : 'Business Category'}
                  options={getBusinessTypes(isUrdu)}
                  value={businessType}
                  onChange={(val) => setBusinessType(val)}
                />
              </div>

              <div>
                <Input
                  label={isUrdu ? 'دکان کا پتہ / شہر' : 'Store Location / City'}
                  id="settings-location"
                  placeholder={isUrdu ? 'مثلاً: مین مارکیٹ، گلبرگ، لاہور' : 'e.g. Main Market, Gulberg III, Lahore'}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label={isUrdu ? 'آپ کی دکان کیا فروخت کرتی ہے؟' : 'What does your store sell?'}
                  id="settings-sells"
                  placeholder={isUrdu ? 'مثلاً: چاول، چینی، آٹا، گھی، چائے، مصالحہ جات' : 'e.g. Rice, sugar, flour, tea, cooking oil, dairy, snacks'}
                  value={sells}
                  onChange={(e) => setSells(e.target.value)}
                  helperText={isUrdu ? 'اس سے اے آئی وائس انجن کو آپ کی دکان کے سامان کے نام سمجھنے میں مدد ملتی ہے۔' : 'Helps the AI voice engine understand your inventory vocabulary.'}
                />
              </div>
            </div>
          </Card>

          {/* Contact & Linking Info with Change Phone Number Flow */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="w-5 h-5 text-ink-secondary" />
              <div>
                <h3 className={`text-sm font-medium text-ink ${isUrdu ? 'font-urdu text-base' : ''}`}>
                  {isUrdu ? 'منسلک واٹس ایپ اور اکاؤنٹ' : 'Linked WhatsApp & Account'}
                </h3>
                <p className="text-xs text-ink-mute">
                  {isUrdu ? 'واٹس ایپ آرڈرز اور خودکار اطلاعات کے لیے استعمال ہونے والی شناخت۔' : 'Identity details used for WhatsApp orders and automated alerts.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-surface/50 border border-hairline flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-ink-mute block">{isUrdu ? 'فعال واٹس ایپ نمبر' : 'Active WhatsApp Number'}</span>
                    <Badge variant="success" className="text-[10px] py-0.5">{isUrdu ? 'فعال' : 'Active'}</Badge>
                  </div>
                  <span className="font-mono text-sm font-medium text-ink block">
                    {profile?.whatsappNumber || (isUrdu ? 'غیر منسلک' : 'Unlinked')}
                  </span>
                </div>

                {!isChangingPhone && (
                  <div className="mt-3 pt-2.5 border-t border-hairline/60 flex items-center justify-between">
                    <span className="text-[11px] text-ink-mute">
                      {isUrdu ? 'بوٹ آرڈرز اور وائس نوٹس یہاں آئیں گے' : 'Bot orders & voice notes sent here'}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setIsChangingPhone(true);
                        setPhoneStep('input');
                        setNewPhoneNumber('');
                        setPhoneOtp('');
                      }}
                      leftIcon={<Pencil className="w-3 h-3" />}
                      className="text-[11px] h-7 px-2.5"
                    >
                      {isUrdu ? 'نمبر تبدیل کریں' : 'Change Number'}
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-lg bg-surface/50 border border-hairline flex flex-col justify-between">
                <div>
                  <span className="text-ink-mute block mb-1.5">{isUrdu ? 'اکاؤنٹ ای میل' : 'Account Email'}</span>
                  <span className="font-mono text-sm font-medium text-ink block">{profile?.email || (isUrdu ? 'کوئی نہیں' : 'None')}</span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-hairline/60">
                  <span className="text-[11px] text-ink-mute">{isUrdu ? 'ڈیش بورڈ میں لاگ اِن کے لیے استعمال ہوتا ہے' : 'Used for dashboard sign-in'}</span>
                </div>
              </div>
            </div>

            {/* Change Phone Number Flow (Step 1: Input / Remove / Add New, Step 2: Verify OTP) */}
            {isChangingPhone && (
              <div className="mt-4 p-4 rounded-card bg-primary-tint space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-hairline">
                  <div className="flex items-center gap-2">
                    <WhatsAppIcon className="w-4 h-4 text-success-ink" />
                    <span className="text-xs font-medium text-ink">
                      {phoneStep === 'input' ? 'Change Store WhatsApp Number' : 'Verify New Phone Number'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPhone(false);
                      setNewPhoneNumber('');
                      setPhoneOtp('');
                    }}
                    className="text-ink-mute hover:text-ink cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {phoneStep === 'input' ? (
                  <div className="space-y-3">
                    <p className="text-xs text-ink-mute">
                      To replace your current number, enter your new Pakistani WhatsApp number below. It will <strong>not</strong> be activated until you verify it with a 6-digit OTP.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <Input
                          id="new-phone-input"
                          placeholder="e.g. 03001234567 or +923001234567"
                          value={newPhoneNumber}
                          onChange={(e) => setNewPhoneNumber(e.target.value)}
                          leftIcon={<Smartphone className="w-4 h-4" />}
                          autoFocus
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleRequestPhoneChange}
                        loading={requestPhoneChangeMutation.isPending}
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                        className="text-xs shrink-0"
                      >
                        Send Verification OTP
                      </Button>
                    </div>

                    <p className="text-[11px] text-ink-mute">
                      Rate limit: Up to 3 code requests per hour.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-lg bg-surface border border-hairline flex items-center justify-between text-xs">
                      <div>
                        <span className="text-ink-mute block text-[11px]">OTP Code Sent to</span>
                        <span className="font-mono font-medium text-ink">{maskedNewPhone || newPhoneNumber}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoneStep('input');
                          setPhoneOtp('');
                        }}
                        className="text-xs text-primary hover:underline cursor-pointer"
                      >
                        Change number
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <Input
                          id="phone-otp-input"
                          placeholder="Enter 6-digit OTP (e.g. 123456)"
                          maxLength={6}
                          value={phoneOtp}
                          onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                          leftIcon={<Key className="w-4 h-4" />}
                          autoFocus
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleVerifyPhoneChange}
                        loading={verifyPhoneChangeMutation.isPending}
                        rightIcon={<Check className="w-4 h-4" />}
                        className="text-xs shrink-0"
                      >
                        Verify & Activate Number
                      </Button>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[11px] text-ink-mute">
                        {phoneRemainingAttempts > 0
                          ? `${phoneRemainingAttempts} request(s) left this hour`
                          : 'Hourly limit reached'}
                      </span>
                      <button
                        type="button"
                        onClick={handleResendPhoneOtp}
                        disabled={phoneCooldown > 0 || resendPhoneCodeMutation.isPending || phoneRemainingAttempts <= 0}
                        className={`text-[11px] font-medium flex items-center gap-1 cursor-pointer ${
                          phoneCooldown > 0 || phoneRemainingAttempts <= 0
                            ? 'text-ink-mute cursor-not-allowed'
                            : 'text-primary hover:underline'
                        }`}
                      >
                        <RefreshCw className={`w-3 h-3 ${resendPhoneCodeMutation.isPending ? 'animate-spin' : ''}`} />
                        {phoneCooldown > 0 ? `Resend in ${phoneCooldown}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={updateProfileMutation.isPending}
              rightIcon={<Check className="w-4 h-4" />}
            >
              {isUrdu ? 'دکان کی معلومات محفوظ کریں' : 'Save Store Changes'}
            </Button>
          </div>
        </form>
      )}

      {/* Tab: Team & Multi-Staff (Pro) */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Shop Reference Code Card */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-hairline">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-pill bg-primary-tint text-primary-deep dark:text-primary">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className={`font-display text-lg font-semibold tracking-tight text-ink ${isUrdu ? 'font-urdu text-xl' : ''}`}>
                      {isUrdu ? 'دکان کا ریفرنس کوڈ اور ٹیم' : 'Shop Reference Code & Team'}
                    </h2>
                    <Badge variant="pro">PRO FEATURE</Badge>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {isUrdu
                      ? '3 سے 5 ملازمین کے ذاتی واٹس ایپ نمبر جوڑیں تاکہ وہ بھی کھاتہ میں سیلز درج کر سکیں'
                      : "Connect 3–5 assistants' personal WhatsApp numbers to log sales into your unified shop ledger"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  {staffData?.subscriptionTier?.toUpperCase() || 'PRO'} PLAN ({staffData?.activeCount ?? 0}/{staffData?.staffLimit ?? 5} {isUrdu ? 'فعال' : 'Active'})
                </Badge>
              </div>
            </div>

            {/* Shop Code Display & Sharing Box */}
            {/* Shop Reference Code Card */}
            {(() => {
              const effectiveShopCode =
                staffData?.shopCode ||
                profile?.shopCode ||
                `VT-${(profile?._id || profile?.id || '1098').slice(-4).toUpperCase()}`;

              return (
                <div className="rounded-xl border border-hairline bg-paper-2/50 p-5 sm:p-6 mb-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                        {isUrdu ? 'آپ کی دکان کا ریفرنس کوڈ' : 'Your Shop Reference Code'}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-3xl font-bold tracking-wider text-primary-deep dark:text-primary">
                          {effectiveShopCode}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyCode(effectiveShopCode)}
                          leftIcon={<Copy className="w-3.5 h-3.5" />}
                        >
                          {isUrdu ? 'کوڈ کاپی کریں' : 'Copy Code'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRegenerateCode}
                          loading={regenerateCodeMutation.isPending}
                          className="text-xs text-muted hover:text-ink"
                          title={isUrdu ? 'نیا ریفرنس کوڈ بنائیں' : 'Generate a new reference code'}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleShareInvite(effectiveShopCode)}
                        leftIcon={<WhatsAppIcon className="w-4 h-4 fill-current" />}
                      >
                        {isUrdu ? 'واٹس ایپ پر ملازم کو دعوت دیں' : 'Invite Assistant via WhatsApp'}
                      </Button>
                    </div>
                  </div>

                  {/* Instructions banner */}
                  <div className="mt-4 pt-4 border-t border-hairline/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-ink">{isUrdu ? '1. ملازم کیسے شامل ہو:' : '1. How staff join:'}</span>
                      <span>
                        {isUrdu ? (
                          <>ملازم وربا ٹاسک بوٹ کو <code className="bg-paper px-1.5 py-0.5 rounded text-ink font-semibold">join {effectiveShopCode} Ali</code> لکھ کر بھیجے۔</>
                        ) : (
                          <>Assistant texts <code className="bg-paper px-1.5 py-0.5 rounded text-ink font-semibold">join {effectiveShopCode} Ali</code> to the VerbaTask WhatsApp bot.</>
                        )}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-ink">{isUrdu ? '2. سیلز کیسے درج ہوں گی:' : '2. How sales work:'}</span>
                      <span>
                        {isUrdu
                          ? 'ان کا بھیجا گیا کوئی بھی وائس نوٹ یا میسج آپ کی دکان کے کھاتے میں ان کے نام کے ساتھ درج ہو جائے گا۔'
                          : 'Any voice note or text they send records an order under your shop with their name tagged.'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Quick Add Form */}
            <form onSubmit={handleAddStaff} className="rounded-xl border border-hairline bg-paper p-4 sm:p-5 mb-6">
              <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                {isUrdu ? 'ملازم کو براہ راست شامل کریں' : 'Add Staff Member Directly'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5">
                  <Input
                    placeholder={isUrdu ? 'ملازم کا نام (مثلاً: علی، حمزہ)' : 'Assistant Name (e.g. Ali, Hamza)'}
                    value={staffNameInput}
                    onChange={(e) => setStaffNameInput(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-5">
                  <Input
                    placeholder={isUrdu ? 'واٹس ایپ فون (مثلاً: 03001234567)' : 'WhatsApp Phone (e.g. 03001234567)'}
                    value={staffPhoneInput}
                    onChange={(e) => setStaffPhoneInput(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    variant="secondary"
                    loading={isAddingStaff}
                    className="w-full justify-center"
                  >
                    {isUrdu ? 'ملازم شامل کریں' : 'Add Staff'}
                  </Button>
                </div>
              </div>
            </form>

            {/* Staff Members List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-muted" />
                  {isUrdu ? `فعال ٹیم ممبران (${staffData?.staffMembers?.length || 0})` : `Active Team Members (${staffData?.staffMembers?.length || 0})`}
                </h3>
                <span className="text-xs text-muted">
                  {isUrdu ? `زیادہ سے زیادہ ${staffData?.staffLimit || 5} ملازمین کی اجازت ہے` : `Max ${staffData?.staffLimit || 5} staff members allowed`}
                </span>
              </div>

              {staffLoading && !staffData ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : (!staffData?.staffMembers || staffData.staffMembers.length === 0) ? (
                <div className="text-center py-8 px-4 rounded-xl border border-dashed border-hairline bg-paper-2/30">
                  <Users className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-ink">{isUrdu ? 'ابھی کوئی ملازم منسلک نہیں ہے' : 'No staff assistants linked yet'}</p>
                  <p className="text-xs text-muted max-w-sm mx-auto mt-1">
                    {isUrdu ? (
                      <>اپنی دکان کا کوڈ <strong className="text-ink">{staffData?.shopCode || profile?.shopCode}</strong> ملازمین کے ساتھ شیئر کریں یا اوپر ان کا نمبر درج کریں۔</>
                    ) : (
                      <>Share your shop code <strong className="text-ink">{staffData?.shopCode || profile?.shopCode}</strong> with your shop boys or enter their phone number above to get started.</>
                    )}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-hairline rounded-xl border border-hairline bg-paper overflow-hidden">
                  {staffData.staffMembers.map((member) => (
                    <div key={member._id} className="flex items-center justify-between p-3.5 sm:px-4 hover:bg-paper-2/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid size-9 shrink-0 place-items-center rounded-pill bg-paper-2 text-ink font-semibold text-xs border border-hairline">
                          {member.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-ink truncate">{member.name}</span>
                            <Badge variant={member.active ? 'success' : 'muted'} className="text-[10px] px-1.5 py-0">
                              {member.active ? (isUrdu ? 'فعال' : 'Active') : (isUrdu ? 'غیر فعال' : 'Inactive')}
                            </Badge>
                            {member.addedBy === 'whatsapp_code' && (
                              <span className="text-[10px] text-muted hidden sm:inline">{isUrdu ? 'بذریعہ واٹس ایپ کوڈ' : 'via WhatsApp Code'}</span>
                            )}
                          </div>
                          <span className="text-xs font-mono text-muted block truncate">
                            +{member.whatsappNumber}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStaff(member._id, member.name)}
                          className="text-danger hover:bg-danger-tint hover:text-danger-deep p-2"
                          title={isUrdu ? 'ملازم کو ہٹائیں' : 'Remove staff member'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Pakistani Banks & Payment Methods */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-hairline">
              <div className="flex items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-pill bg-success-tint text-success-ink">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className={`font-display text-lg font-semibold tracking-tight text-ink ${isUrdu ? 'font-urdu text-xl' : ''}`}>
                    {isUrdu ? 'قابلِ قبول پاکستانی ادائیگیاں' : 'Accepted Pakistani Payment Methods'}
                  </h2>
                  <p className="text-xs text-ink-mute">
                    {isUrdu
                      ? 'منتخب کریں کہ کون سے ادائیگی کے پلیٹ فارم فعال ہیں۔ صرف منتخب کردہ طریقے واٹس ایپ بوٹ پر پیش کیے جائیں گے۔'
                      : 'Choose which payment platforms are active. Only selected methods are offered to your WhatsApp bot.'}
                  </p>
                </div>
              </div>

              <Badge variant="success" className="self-start sm:self-auto py-1 px-3">
                {activePaymentIds.length} {isUrdu ? 'چینلز فعال' : 'Channels Active'}
              </Badge>
            </div>

            <div className="space-y-6">
              {/* Default Payment Method */}
              <div>
                <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-3">
                  {isUrdu ? 'بنیادی ادائیگی کا طریقہ' : 'Default Payment Method'}
                </h3>
                <div className="max-w-md">
                  <Select
                    value={defaultPaymentMethod}
                    onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                  >
                    {allMethods
                      .filter((m) => activePaymentIds.includes(m.id) || m.id === 'cash')
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.nameUrdu ? `(${m.nameUrdu})` : ''}
                        </option>
                      ))}
                  </Select>
                  <p className="text-[11px] text-ink-mute mt-1.5">
                    {isUrdu
                      ? 'اگر آرڈر میں ادائیگی کا طریقہ درج نہ ہو تو خود بخود یہ طریقہ استعمال ہو گا۔'
                      : 'If an order is logged without specifying the payment type, this method will be used automatically.'}
                  </p>
                </div>
              </div>

              {/* Cash Section */}
              <div>
                <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-3">
                  {isUrdu ? 'نقد رقم (کیش)' : 'Cash in Hand'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {cashMethods.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border border-primary bg-success-tint flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-medium text-ink">{m.name}</p>
                        <p className="text-[11px] text-ink-mute">{m.nameUrdu}</p>
                      </div>
                      <Badge variant="success">{isUrdu ? 'ہمیشہ فعال' : 'Always On'}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Digital Wallets & EMIs */}
              <div>
                <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-3">
                  {isUrdu
                    ? 'ڈیجیٹل والٹس اور ای ایم آئی (ایزی پیسہ، جاز کیش، نیا پے، راست وغیرہ)'
                    : 'Digital Wallets & EMIs (SadaPay, NayaPay, Raast, etc.)'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {walletMethods.map((m) => {
                    const isActive = activePaymentIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => togglePaymentMethod(m.id)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer select-none flex flex-col justify-between gap-2 ${
                          isActive
                            ? 'border-primary bg-primary/5 shadow-xs'
                            : 'border-hairline bg-surface/30 hover:border-hairline/80 opacity-70'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium text-ink">{m.name}</p>
                              {m.isPopular && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-pear-tint text-warn-ink font-medium">
                                  {isUrdu ? 'مقبول' : 'Popular'}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-ink-mute font-arabic">{m.nameUrdu}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                              isActive ? 'bg-primary text-on-primary' : 'border border-hairline bg-canvas'
                            }`}
                          >
                            {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>

                        {/* Optional Account Title / IBAN display if active */}
                        {isActive && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 pt-2 border-t border-hairline/50"
                          >
                            <input
                              type="text"
                              placeholder={isUrdu ? 'اختیاری اکاؤنٹ نمبر / آئی بین' : 'Optional Account / IBAN'}
                              value={paymentDetails[m.id]?.accountNumber || ''}
                              onChange={(e) =>
                                handlePaymentDetailChange(m.id, 'accountNumber', e.target.value)
                              }
                              className="w-full rounded-sm border border-rule-2 bg-surface px-2 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Major Commercial & Islamic Banks */}
              <div>
                <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-3">
                  {isUrdu
                    ? 'پاکستانی کمرشل اور اسلامی بینک (میزان، ایچ بی ایل، الفلاح وغیرہ)'
                    : 'Pakistani Commercial & Islamic Banks (Meezan, HBL, Alfalah, etc.)'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {bankMethods.map((m) => {
                    const isActive = activePaymentIds.includes(m.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => togglePaymentMethod(m.id)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer select-none flex flex-col justify-between gap-2 ${
                          isActive
                            ? 'border-primary bg-primary/5 shadow-xs'
                            : 'border-hairline bg-surface/30 hover:border-hairline/80 opacity-70'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium text-ink">{m.name}</p>
                              {m.isPopular && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-pear-tint text-warn-ink font-medium">
                                  {isUrdu ? 'مقبول' : 'Popular'}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-ink-mute font-arabic">{m.nameUrdu}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                              isActive ? 'bg-primary text-on-primary' : 'border border-hairline bg-canvas'
                            }`}
                          >
                            {isActive && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>

                        {isActive && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 pt-2 border-t border-hairline/50"
                          >
                            <input
                              type="text"
                              placeholder={isUrdu ? 'اکاؤنٹ کا عنوان / آئی بین' : 'Account Title / IBAN'}
                              value={paymentDetails[m.id]?.accountNumber || ''}
                              onChange={(e) =>
                                handlePaymentDetailChange(m.id, 'accountNumber', e.target.value)
                              }
                              className="w-full rounded-sm border border-rule-2 bg-surface px-2 py-1.5 text-xs text-ink focus:border-ink focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSavePayments}
              loading={updatePaymentsMutation.isPending}
              rightIcon={<Check className="w-4 h-4" />}
            >
              {isUrdu ? 'ادائیگی کے چینلز محفوظ کریں' : 'Save Payment Channels'}
            </Button>
          </div>
        </div>
      )}

      {/* Tab 3: Voice & Language AI */}
      {activeTab === 'voice' && (
        <form onSubmit={handleSaveVoice} className="space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-hairline">
              <div className="grid size-10 shrink-0 place-items-center rounded-pill bg-sky-tint text-sky-ink">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`font-display text-lg font-semibold tracking-tight text-ink ${isUrdu ? 'font-urdu text-xl' : ''}`}>
                  {isUrdu ? 'وائس اور آڈیو سیٹنگز' : 'Conversational AI Voice Configuration'}
                </h2>
                <p className="text-xs text-ink-mute">
                  {isUrdu
                    ? 'اردو وائس نوٹ کی ترکیب اور واٹس ایپ پر صوتی جوابات کی ترتیبات۔'
                    : 'Control spoken Urdu voice synthesis and how WhatsApp responds to your voice notes.'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-secondary flex items-center gap-1 mb-1.5">
                  {isUrdu ? 'بنیادی زبان' : 'Default Language'}
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <button
                    type="button"
                    onClick={() => setLanguage('ur')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      language === 'ur'
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-hairline text-ink hover:bg-surface/50'
                    }`}
                  >
                    <p className="text-xs font-medium">اردو (Urdu)</p>
                    <p className="text-[10px] text-ink-mute mt-0.5">Uzma Urdu Neural Voice</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      language === 'en'
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-hairline text-ink hover:bg-surface/50'
                    }`}
                  >
                    <p className="text-xs font-medium">English</p>
                    <p className="text-[10px] text-ink-mute mt-0.5">Jenny English Neural Voice</p>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-hairline">
                <label className="text-xs font-medium text-ink-secondary block mb-2">
                  {isUrdu ? 'وائس نوٹ کے جوابات (TTS)' : 'Voice Note Responses (TTS)'}
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: 'voice_on_voice',
                      title: isUrdu ? 'وائس پر وائس جواب (تجویز کردہ)' : 'Voice-on-Voice (Recommended)',
                      desc: isUrdu
                        ? 'صرف وائس نوٹ کے جواب میں بول کر جواب دیں۔ لکھے ہوئے میسج پر ٹیکسٹ جواب دیں۔'
                        : 'Bot replies with a spoken voice note only when you send a voice note. Typed text gets a text reply.',
                    },
                    {
                      id: 'always_voice',
                      title: isUrdu ? 'ہمیشہ وائس نوٹ' : 'Always Voice Note',
                      desc: isUrdu
                        ? 'بوٹ ہر پیغام کے جواب میں ہمیشہ بول کر آڈیو بھیجے گا۔'
                        : 'Bot always replies with a spoken voice note, even when you send typed messages.',
                    },
                    {
                      id: 'text_only',
                      title: isUrdu ? 'صرف ٹیکسٹ میسجز (خاموش)' : 'Text Messages Only (Silent)',
                      desc: isUrdu
                        ? 'بوٹ کبھی بھی آڈیو نوٹ نہیں بھیجے گا، صرف تحریری جواب دے گا۔'
                        : 'Bot never sends audio notes back, only text messages.',
                    },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                        replyPreference === opt.id
                          ? 'border-primary bg-primary/5'
                          : 'border-hairline bg-surface/20 hover:bg-surface/40'
                      }`}
                    >
                      <input
                        type="radio"
                        name="replyPreference"
                        value={opt.id}
                        checked={replyPreference === opt.id}
                        onChange={(e) => setReplyPreference(e.target.value)}
                        className="mt-0.5 text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="text-xs font-medium text-ink">{opt.title}</p>
                        <p className="text-[11px] text-ink-mute mt-0.5 leading-relaxed">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-hairline">
              <div className="grid size-10 shrink-0 place-items-center rounded-pill bg-sky-tint text-sky-ink">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`font-display text-lg font-semibold tracking-tight text-ink ${isUrdu ? 'font-urdu text-xl' : ''}`}>
                  {isUrdu ? 'واٹس ایپ آٹومیشنز' : 'WhatsApp Automations'}
                </h2>
                <p className="text-xs text-ink-mute">
                  {isUrdu
                    ? 'جب آپ بوٹ کو کوئی اصول بنانے کو کہیں (مثلاً: جب چاول 5 سے کم ہوں تو الرٹ کرو)۔'
                    : 'What happens when you ask the bot to create an automation, e.g. "alert me when rice is below 5".'}
                </p>
              </div>
            </div>

            <label
              className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                confirmAutomations
                  ? 'border-primary bg-primary/5'
                  : 'border-hairline bg-surface/20 hover:bg-surface/40'
              }`}
            >
              <input
                type="checkbox"
                checked={confirmAutomations}
                onChange={(e) => setConfirmAutomations(e.target.checked)}
                className="mt-0.5 text-primary focus:ring-primary"
              />
              <div>
                <p className="text-xs font-medium text-ink">
                  {isUrdu ? 'آٹومیشن محفوظ کرنے سے پہلے مجھ سے تصدیق کریں' : 'Ask me before saving automations'}
                </p>
                <p className="text-[11px] text-ink-mute mt-0.5 leading-relaxed">
                  {isUrdu
                    ? 'فعال ہونے پر، بوٹ ہر نئے اصول پر Save / Cancel بٹن دے گا۔ بند ہونے پر، وہ فوراً محفوظ کر لے گا۔'
                    : 'When on, the bot reads each new automation back with Save / Cancel buttons. When off, it saves straight away and tells you what was saved. You can also type "confirm on" or "confirm off" on WhatsApp.'}
                </p>
              </div>
            </label>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={updateProfileMutation.isPending}
              rightIcon={<Check className="w-4 h-4" />}
            >
              {isUrdu ? 'ترجیحات محفوظ کریں' : 'Save Preferences'}
            </Button>
          </div>
        </form>
      )}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
