import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
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
  Volume2,
  AlertTriangle,
  Clock,
  XCircle,
} from 'lucide-react';
import { WhatsAppIcon } from '../components/ui/WhatsAppIcon';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import Modal from '../components/ui/Modal';
import { api } from '../lib/api';
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
import { formatPhone, normalizePhone } from '../lib/format';

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

export function SettingsPage({ initialTab }) {
  const uiLanguage = useUiStore((s) => s.language);
  const isUrdu = uiLanguage === 'ur';

  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(initialTab || queryTab || 'profile');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (queryTab && ['profile', 'team', 'payments', 'voice'].includes(queryTab)) {
      setActiveTab(queryTab);
    }
  }, [initialTab, queryTab]);

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

  const handleCopyInviteMessage = (code) => {
    if (!code) return;
    const cleanStore = (profile?.businessName || 'Dukaan').split(',')[0].trim();
    const msg = isUrdu
      ? `Assalam-o-Alaikum! ${cleanStore} کے وربا ٹاسک کھاتے میں شامل ہونے کے لیے واٹس ایپ بوٹ کو یہ میسج بھیجیں:\njoin ${code} علی`
      : `Assalam-o-Alaikum! To join ${cleanStore}'s shop ledger on VerbaTask, send this message to the bot:\njoin ${code} Ali`;
    navigator.clipboard.writeText(msg);
    toast.success(isUrdu ? 'دعوتی پیغام کاپی ہو گیا!' : 'Invitation message copied to clipboard!');
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

    const normalizedPhone = normalizePhone(staffPhoneInput.trim());
    if (!normalizedPhone || normalizedPhone.length < 10) {
      toast.error('Please enter a valid Pakistani WhatsApp number (e.g. 03001234567)');
      return;
    }

    try {
      setIsAddingStaff(true);
      const res = await addStaffMutation.mutateAsync({
        name: staffNameInput.trim(),
        whatsappNumber: normalizedPhone,
      });
      if (res?.pendingApproval) {
        toast.info(res.message || (isUrdu ? 'واٹس ایپ پر شمولیت کی درخواست بھیج دی گئی ہے۔' : 'Transfer invitation sent to assistant on WhatsApp!'));
      } else {
        toast.success(isUrdu ? `${staffNameInput.trim()} کو دکان میں شامل کر لیا گیا!` : `${staffNameInput.trim()} added to your shop staff!`);
      }
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

  // Disable / Delete Shop State
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [confirmStoreNameInput, setConfirmStoreNameInput] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);

  const handleDisableShop = async () => {
    try {
      setIsDisabling(true);
      await api.post('/api/merchants/disable-shop');
      toast.success(isUrdu ? 'دکان کامیابی سے غیر فعال اور نمبر ان لنک ہو گیا ہے' : 'Shop disabled and credentials unlinked successfully.');
      setIsDisableModalOpen(false);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    } catch (err) {
      toast.error(err.message || 'Failed to disable shop');
      setIsDisabling(false);
    }
  };

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
  const [voiceGender, setVoiceGender] = useState('female');
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [replyPreference, setReplyPreference] = useState('voice_on_voice');
  const [confirmAutomations, setConfirmAutomations] = useState(false);
  const [requireApprovalForHighValue, setRequireApprovalForHighValue] = useState(false);
  const [highValueThreshold, setHighValueThreshold] = useState(10000);

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
      setVoiceGender(profile.voiceGender || 'female');
      setVoiceReplies(profile.voiceReplies ?? true);
      setReplyPreference(profile.replyPreference || 'voice_on_voice');
      setConfirmAutomations(profile.confirmAutomations ?? false);
      setRequireApprovalForHighValue(profile.requireApprovalForHighValue ?? false);
      setHighValueThreshold(profile.highValueThreshold ?? 10000);
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
        voiceGender,
        voiceReplies,
        replyPreference,
        confirmAutomations,
        requireApprovalForHighValue,
        highValueThreshold: Number(highValueThreshold) || 10000,
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
            { id: 'team', label: isUrdu ? 'ٹیم اور ملازمین' : 'Team & Staff', hint: isUrdu ? `${staffData?.activeCount ?? profile?.staffMembers?.length ?? 0} منسلک (سب کے لیے دستیاب)` : `${staffData?.activeCount ?? profile?.staffMembers?.length ?? 0} connected (All Access)`, icon: Users },
            { id: 'payments', label: isUrdu ? 'ادائیگی کے ذرائع' : 'Payments', hint: isUrdu ? `${activePaymentIds.length} فعال` : `${activePaymentIds.length} accepted`, icon: CreditCard },
            { id: 'voice', label: isUrdu ? 'آواز اور زبان' : 'Voice & language', hint: isUrdu ? 'بوٹ کس طرح بولے' : 'How the bot talks', icon: Mic },
          ].map((t) => {
            const on = activeTab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id);
                  setSearchParams({ tab: t.id }, { replace: true });
                }}
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

          {/* Danger Zone: Disable & Unlink Store */}
          <div className="mt-10 pt-6 border-t border-rule">
            <div className="rounded-2xl border border-coral/30 bg-coral/5 p-5 sm:p-6 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-5 text-coral shrink-0" />
                    <h3 className="font-heading font-semibold text-ink text-base">
                      {isUrdu ? 'دکان ختم / غیر فعال کریں' : 'Delete / Disable Shop'}
                    </h3>
                  </div>
                  <p className="text-xs text-muted max-w-xl">
                    {isUrdu
                      ? 'یہ عمل آپ کا واٹس ایپ نمبر اور ای میل ان لنک کر دے گا تاکہ آپ دوبارہ نیا اکاؤنٹ یا نمبر استعمال کر سکیں۔ دکان کا تمام سابقہ ریکارڈ محفوظ رہے گا مگر ڈیش بورڈ بند ہو جائے گا۔'
                      : 'Unlinks your WhatsApp number and email credentials, freeing them for future use. Store records are safely archived in the database, while active store access is disabled.'}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => setIsDisableModalOpen(true)}
                  className="shrink-0"
                >
                  {isUrdu ? 'دکان ختم کریں' : 'Delete Shop'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Tab: Team & Multi-Staff (Pro) */}
      {activeTab === 'team' && (() => {
        const staffList = (staffData?.staffMembers || []).filter((member, idx, arr) => {
          const norm = normalizePhone(member.whatsappNumber);
          return idx === arr.findIndex((x) => (norm && normalizePhone(x.whatsappNumber) === norm) || x._id === member._id);
        });
        const activeStaffCount = staffList.filter((s) => s.active).length;
        const staffLimit = staffData?.staffLimit ?? 5;

        return (
          <div className="space-y-6">
            {/* Shop Reference Code Card */}
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-hairline">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-pill bg-primary-tint text-primary-deep dark:text-primary">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`font-display text-lg font-semibold tracking-tight text-ink ${isUrdu ? 'font-urdu text-xl' : ''}`}>
                        {isUrdu ? 'دکان کا ریفرنس کوڈ اور ٹیم' : 'Shop Reference Code & Team'}
                      </h2>
                      <Badge variant="success">
                        {isUrdu ? 'سب کے لیے فعال' : 'ALL ACCESS PREVIEW'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {isUrdu
                        ? '3 سے 5 ملازمین کے ذاتی واٹس ایپ نمبر جوڑیں تاکہ وہ بھی کھاتہ میں سیلز درج کر سکیں (ٹیسٹنگ کے دوران سب کے لیے مفت)'
                        : "Connect 3–5 assistants' personal WhatsApp numbers to log sales into your unified shop ledger (Free for all during testing)"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-mono font-medium tracking-wide whitespace-nowrap shrink-0">
                    <ShieldCheck className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="whitespace-nowrap">
                      {isUrdu ? 'مفت ٹیسٹنگ رسائی' : 'FREE PREVIEW'} ({activeStaffCount}/{staffLimit} {isUrdu ? 'فعال' : 'Active'})
                    </span>
                  </span>
                </div>
              </div>

              {/* Shop Code Display & Sharing Box */}
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

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleCopyInviteMessage(effectiveShopCode)}
                          leftIcon={<Copy className="w-4 h-4" />}
                        >
                          {isUrdu ? 'دعوتی پیغام کاپی کریں' : 'Copy Invite Message'}
                        </Button>
                        <span className="text-xs text-muted">
                          {isUrdu
                            ? '💡 یا نیچے ملازم کا نمبر براہ راست درج کریں — وربا ٹاسک بوٹ خودکار طور پر انہیں واٹس ایپ پر دعوتی پیغام بھیج دے گا۔'
                            : '💡 Or enter their phone number below — VerbaTask bot automatically sends them the invite on WhatsApp.'}
                        </span>
                      </div>
                    </div>

                    {/* Instructions banner */}
                    <div className="mt-5 pt-4 border-t border-hairline/70 grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                      <div className="flex items-start gap-3 rounded-lg bg-paper-2/40 dark:bg-paper-2/20 border border-hairline/60 p-3">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-tint font-mono font-bold text-xs text-primary-deep dark:text-primary">
                          1
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="font-semibold text-ink">
                            {isUrdu ? 'ملازم کو کیسے شامل کریں' : 'How assistants join'}
                          </div>
                          <p className="text-muted leading-relaxed">
                            {isUrdu ? (
                              <>نیچے براہ راست ان کا واٹس ایپ نمبر درج کریں (وربا ٹاسک خودکار واٹس ایپ بھیج دے گا)، یا دعوتی میسج کاپی کر کے انہیں بھیجیں تاکہ وہ <code className="inline-block font-mono bg-paper px-1.5 py-0.5 rounded border border-hairline text-ink font-semibold text-[11px]">join {effectiveShopCode} Ali</code> بھیجیں۔</>
                            ) : (
                              <>Add their number below (VerbaTask sends the WhatsApp invite automatically), or copy the invite message so they can text <code className="inline-block font-mono bg-paper px-1.5 py-0.5 rounded border border-hairline text-ink font-semibold text-[11px]">join {effectiveShopCode} Ali</code> to the bot.</>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 rounded-lg bg-paper-2/40 dark:bg-paper-2/20 border border-hairline/60 p-3">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-tint font-mono font-bold text-xs text-primary-deep dark:text-primary">
                          2
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="font-semibold text-ink">
                            {isUrdu ? 'سیلز اور کھاتہ کا عمل' : 'How staff sales work'}
                          </div>
                          <p className="text-muted leading-relaxed">
                            {isUrdu
                              ? 'ان کا بھیجا گیا کوئی بھی وائس نوٹ یا میسج آپ کی دکان کے کھاتے میں ان کے نام کے ساتھ خودکار درج ہو جائے گا۔'
                              : 'Any voice note or text they send records an order under your shop with their name tagged.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Quick Add Form */}
              <form onSubmit={handleAddStaff} className="rounded-xl border border-hairline bg-paper p-4 sm:p-5 mb-6">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-primary" />
                    {isUrdu ? 'ملازم کو براہ راست شامل کریں (فوری رسائی)' : 'Add Staff Member Directly (Instant Access)'}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    {isUrdu
                      ? 'ملازم کا نام اور واٹس ایپ نمبر درج کریں — وہ فوری شامل ہو جائیں گے اور انہیں کوئی کوڈ ڈالنے کی ضرورت نہیں ہو گی۔'
                      : 'Enter assistant name and WhatsApp number — they are added immediately with no code entry required.'}
                  </p>
                </div>
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
                    {isUrdu ? `ٹیم ممبران (${staffList.length})` : `Team Members (${staffList.length})`}
                  </h3>
                  <span className="text-xs text-muted">
                    {isUrdu ? `زیادہ سے زیادہ ${staffLimit} ملازمین کی اجازت ہے` : `Max ${staffLimit} staff members allowed`}
                  </span>
                </div>

                {staffLoading && !staffData ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-14 w-full" />
                  </div>
                ) : (staffList.length === 0) ? (
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
                    {staffList.map((member) => {
                      const isPending = member.status === 'pending_switch';
                      const isRejected = member.status === 'rejected';

                      let badgeVariant = 'muted';
                      let badgeText = isUrdu ? 'غیر فعال' : 'Inactive';

                      if (isPending) {
                        badgeVariant = 'warning';
                        badgeText = isUrdu ? 'منتقلی کا انتظار' : 'Pending Transfer';
                      } else if (isRejected) {
                        badgeVariant = 'danger';
                        badgeText = isUrdu ? 'منتقلی مسترد' : 'Transfer Rejected';
                      } else if (member.active) {
                        badgeVariant = 'success';
                        badgeText = isUrdu ? 'فعال' : 'Active';
                      }

                      return (
                        <div key={member._id} className="flex items-center justify-between p-3.5 sm:px-4 hover:bg-paper-2/40 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`grid size-9 shrink-0 place-items-center rounded-pill font-semibold text-xs border ${
                              isRejected
                                ? 'bg-coral-tint text-danger-ink border-red-200 dark:border-red-900/50'
                                : isPending
                                ? 'bg-pear-tint text-warn-ink border-amber-200 dark:border-amber-900/50'
                                : 'bg-paper-2 text-ink border-hairline'
                            }`}>
                              {(member.name || 'ST').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-ink truncate">{member.name}</span>
                                <Badge variant={badgeVariant} className="text-[10px] px-1.5 py-0">
                                  {badgeText}
                                </Badge>
                                {member.addedBy === 'whatsapp_code' && (
                                  <span className="text-[10px] text-muted hidden sm:inline">{isUrdu ? 'بذریعہ واٹس ایپ کوڈ' : 'via WhatsApp Code'}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                <span className="text-xs font-mono text-muted block truncate">
                                  {formatPhone(member.whatsappNumber)}
                                </span>
                                {isPending && (
                                  <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                                    <Clock className="w-3 h-3 shrink-0" />
                                    {isUrdu ? 'واٹس ایپ پر شمولیت کی تصدیق کا انتظار ہے' : 'Awaiting confirmation on WhatsApp'}
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="text-[11px] text-coral flex items-center gap-1 font-medium">
                                    <XCircle className="w-3 h-3 shrink-0" />
                                    {isUrdu ? 'ملازم نے شمولیت مسترد کر دی ہے اور اپنی سابقہ دکان پر ہیں' : 'Assistant declined transfer and stayed at previous store'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isRejected && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setStaffNameInput(member.name);
                                  setStaffPhoneInput(member.whatsappNumber);
                                }}
                                className="text-xs py-1 px-2.5 h-8"
                                title={isUrdu ? 'دوبارہ دعوت دیں' : 'Re-invite assistant'}
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                {isUrdu ? 'دوبارہ بھیجیں' : 'Re-invite'}
                              </Button>
                            )}
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
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </div>
        );
      })()}

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

              {/* Voice Avatar Selection: Exactly 1 Female and 1 Male Voice */}
              <div className="pt-4 border-t border-hairline">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-ink-secondary flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-primary" />
                    {isUrdu ? 'اے آئی وائس اوتار (صوتی آواز)' : 'AI Voice Avatar (Single Voice Policy)'}
                  </label>
                  <span className="text-[10px] text-ink-mute bg-surface px-2 py-0.5 rounded-pill border border-hairline">
                    {isUrdu ? 'شائستہ اور بااخلاق لب و لہجہ' : 'Polite & Courteous Tone'}
                  </span>
                </div>
                <p className="text-[11px] text-ink-mute mb-3">
                  {isUrdu
                    ? 'واٹس ایپ پر بول کر جواب دینے کے لیے 1 خاتون یا 1 مردانہ آواز کا انتخاب کریں۔ آپ واٹس ایپ پر "عورت کی آواز" یا "مرد کی آواز" بول کر بھی آواز تبدیل کر سکتے ہیں۔'
                    : 'Select exactly 1 Female or 1 Male voice avatar for your WhatsApp audio replies. You can also switch anytime by speaking "male voice" or "female voice" in a voice note.'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                  <button
                    type="button"
                    onClick={() => setVoiceGender('female')}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer relative ${
                      voiceGender === 'female'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs'
                        : 'border-hairline text-ink hover:bg-surface/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👩</span>
                        <div>
                          <p className="text-xs font-semibold text-ink">
                            {isUrdu ? 'خاتون کی آواز (Female)' : 'Female Voice Avatar'}
                          </p>
                          <p className="text-[10px] text-ink-mute">
                            {language === 'ur' ? 'Uzma Urdu Neural (پاکستان)' : 'Jenny English Neural (US)'}
                          </p>
                        </div>
                      </div>
                      {voiceGender === 'female' && (
                        <span className="size-5 rounded-full bg-primary text-white grid place-items-center shrink-0">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-secondary bg-surface/60 rounded px-2 py-1 mt-1">
                      {isUrdu ? 'بہت شائستہ، نرم اور احترام پر مبنی گفتگو' : 'Polite, calm & courteous tone'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVoiceGender('male')}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer relative ${
                      voiceGender === 'male'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs'
                        : 'border-hairline text-ink hover:bg-surface/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👨</span>
                        <div>
                          <p className="text-xs font-semibold text-ink">
                            {isUrdu ? 'مردانہ آواز (Male)' : 'Male Voice Avatar'}
                          </p>
                          <p className="text-[10px] text-ink-mute">
                            {language === 'ur' ? 'Asad Urdu Neural (پاکستان)' : 'Guy English Neural (US)'}
                          </p>
                        </div>
                      </div>
                      {voiceGender === 'male' && (
                        <span className="size-5 rounded-full bg-primary text-white grid place-items-center shrink-0">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-secondary bg-surface/60 rounded px-2 py-1 mt-1">
                      {isUrdu ? 'سنجیدہ، شائستہ اور احترام پر مبنی گفتگو' : 'Polite, clear & courteous tone'}
                    </p>
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

          {/* Order Approvals Configuration */}
          <Card>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-hairline">
              <div className="grid size-10 shrink-0 place-items-center rounded-pill bg-pear-tint text-warn-ink">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className={`font-display text-lg font-semibold tracking-tight text-ink ${isUrdu ? 'font-urdu text-xl' : ''}`}>
                  {isUrdu ? 'بڑی سیلز کی منظوری (Order Approvals)' : 'Order Approvals (High-Value Limit)'}
                </h2>
                <p className="text-xs text-ink-mute">
                  {isUrdu
                    ? 'بڑی مالیت کے آرڈرز پر دکان کے مالک کی منظوری درکار ہو یا نہیں۔'
                    : 'Control whether high-value sales require store owner approval before being recorded.'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <label
                className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                  requireApprovalForHighValue
                    ? 'border-primary bg-primary/5'
                    : 'border-hairline bg-surface/20 hover:bg-surface/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={requireApprovalForHighValue}
                  onChange={(e) => setRequireApprovalForHighValue(e.target.checked)}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <div>
                  <p className="text-xs font-medium text-ink">
                    {isUrdu ? 'مقررہ حد سے بڑی سیلز پر منظوری لازمی کریں' : 'Require owner approval for high-value sales'}
                  </p>
                  <p className="text-[11px] text-ink-mute mt-0.5 leading-relaxed">
                    {isUrdu
                      ? 'پہلے سے بند (Off) ہے۔ بند رکھنے کی صورت میں دکان کا عملہ بغیر رکاوٹ کے کسی بھی رقم کی سیلز درج کر سکتا ہے۔ اگر فعال کریں گے تو مقررہ حد سے اوپر کے آرڈرز ڈیش بورڈ پر آپ کی منظوری کے منتظر رہیں گے۔'
                      : 'Disabled by default. When turned off, store assistants can log sales freely without waiting for approval. When turned on, sales exceeding your threshold require owner confirmation.'}
                  </p>
                </div>
              </label>

              {requireApprovalForHighValue && (
                <div className="pt-2">
                  <Input
                    label={isUrdu ? 'منظوری کی کم از کم حد (روپے)' : 'Approval Threshold Amount (PKR)'}
                    type="number"
                    min="1000"
                    step="500"
                    value={highValueThreshold}
                    onChange={(e) => setHighValueThreshold(Number(e.target.value))}
                    helperText={isUrdu ? 'اس رقم یا اس سے بڑے آرڈرز منظوری کے لیے روکے جائیں گے۔' : 'Orders equal to or above this amount will be held for approval.'}
                    className="max-w-xs"
                  />
                </div>
              )}
            </div>
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

      {/* DISABLE / DELETE SHOP CONFIRMATION MODAL */}
      <Modal
        isOpen={isDisableModalOpen}
        onClose={() => {
          if (!isDisabling) {
            setIsDisableModalOpen(false);
            setConfirmStoreNameInput('');
          }
        }}
        title={isUrdu ? 'دکان ختم کرنے کی تصدیق' : 'Confirm Shop Deletion / Disable'}
        description={
          isUrdu
            ? 'کیا آپ واقعی اس دکان کو غیر فعال اور نمبر ان لنک کرنا چاہتے ہیں؟'
            : 'Are you sure you want to disable this store and unlink your phone number and email?'
        }
      >
        <div className="space-y-4 pt-1">
          <div className="rounded-lg bg-coral/10 border border-coral/20 p-3.5 text-xs text-coral-deep dark:text-coral leading-relaxed">
            <p className="font-semibold mb-1">
              {isUrdu ? '⚠️ توجہ فرمائیں:' : '⚠️ Warning:'}
            </p>
            <p>
              {isUrdu
                ? `آپ کا واٹس ایپ نمبر (${profile?.whatsappNumber || ''}) اور ای میل (${profile?.email || ''}) فوری طور پر آزاد کر دیے جائیں گے اور آپ لاگ آؤٹ ہو جائیں گے۔`
                : `Your WhatsApp number (${profile?.whatsappNumber || ''}) and email (${profile?.email || ''}) will be unlinked immediately, and you will be logged out.`}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink">
              {isUrdu
                ? `تصدیق کے لیے دکان کا نام لکھیں: "${businessName || profile?.businessName || 'Store'}"`
                : `Type "${businessName || profile?.businessName || 'Store'}" to confirm:`}
            </label>
            <Input
              value={confirmStoreNameInput}
              onChange={(e) => setConfirmStoreNameInput(e.target.value)}
              placeholder={businessName || profile?.businessName || 'Store'}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-rule">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsDisableModalOpen(false);
                setConfirmStoreNameInput('');
              }}
              disabled={isDisabling}
            >
              {isUrdu ? 'منسوخ کریں' : 'Cancel'}
            </Button>
            <Button
              variant="danger"
              type="button"
              disabled={confirmStoreNameInput.trim().toLowerCase() !== (businessName || profile?.businessName || 'Store').trim().toLowerCase() || isDisabling}
              loading={isDisabling}
              onClick={handleDisableShop}
            >
              {isUrdu ? 'ہاں، دکان ختم کریں' : 'Yes, Delete Shop'}
            </Button>
          </div>
        </div>
      </Modal>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
