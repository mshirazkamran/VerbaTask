import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  IconBuildingStore,
  IconCreditCard,
  IconMicrophone,
  IconLanguage,
  IconCheck,
  IconShieldCheck,
  IconWallet,
  IconInfoCircle,
  IconDeviceMobile,
  IconRefresh,
} from '@tabler/icons-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import {
  useMerchantProfile,
  useUpdateMerchantProfile,
  usePaymentMethods,
  useUpdatePaymentMethods,
} from '../hooks/useMerchantSettings';

const BUSINESS_TYPES = [
  { value: 'kiryana', label: 'Kiryana / Grocery Store' },
  { value: 'clothing', label: 'Clothing & Apparel / Boutique' },
  { value: 'medical', label: 'Pharmacy / Medical Store' },
  { value: 'electronics', label: 'Electronics & Mobile Accessories' },
  { value: 'restaurant', label: 'Restaurant / Cafe / Dhaba' },
  { value: 'general', label: 'General Retail Store' },
  { value: 'auto', label: 'Auto Spare Parts & Workshop' },
  { value: 'salon', label: 'Salon & Cosmetics' },
  { value: 'services', label: 'Services & Trade' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'voice' | 'payments'

  const { data: profile, isLoading: profileLoading } = useMerchantProfile();
  const updateProfileMutation = useUpdateMerchantProfile();

  const { data: paymentMethodsData, isLoading: paymentsLoading } = usePaymentMethods();
  const updatePaymentsMutation = useUpdatePaymentMethods();

  // Store Profile State
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('general');
  const [location, setLocation] = useState('');
  const [sells, setSells] = useState('');

  // Voice & Language State
  const [language, setLanguage] = useState('ur');
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [replyPreference, setReplyPreference] = useState('voice_on_voice');

  // Payments State
  const [activePaymentIds, setActivePaymentIds] = useState([]);
  const [paymentDetails, setPaymentDetails] = useState({});

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

  // Handle Voice Settings Save
  const handleSaveVoice = async (e) => {
    e.preventDefault();
    try {
      await updateProfileMutation.mutateAsync({
        language,
        voiceReplies,
        replyPreference,
      });
      toast.success('Voice and language preferences updated!');
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-ink">Store Settings & Profile</h1>
          <p className="text-xs text-ink-mute mt-1">
            Customize your store identity, WhatsApp voice AI persona, and accepted Pakistani payment channels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="neutral" className="gap-1.5 py-1 px-2.5">
            <IconShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Active Store: {profile?.businessName || 'My Business'}</span>
          </Badge>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-hairline pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-primary text-primary'
              : 'border-transparent text-ink-mute hover:text-ink'
          }`}
        >
          <IconBuildingStore className="w-4 h-4" />
          Store Profile
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'payments'
              ? 'border-primary text-primary'
              : 'border-transparent text-ink-mute hover:text-ink'
          }`}
        >
          <IconCreditCard className="w-4 h-4" />
          Pakistani Banks & Payments
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-bold">
            {activePaymentIds.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('voice')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'voice'
              ? 'border-primary text-primary'
              : 'border-transparent text-ink-mute hover:text-ink'
          }`}
        >
          <IconMicrophone className="w-4 h-4" />
          Voice & Language AI
        </button>
      </div>

      {/* Tab 1: Store Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-hairline">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <IconBuildingStore className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-medium text-ink">Store Identity</h2>
                <p className="text-xs text-ink-mute">
                  Rename your business and specify your location and retail specialty.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Store / Business Name"
                  id="settings-store-name"
                  placeholder="e.g. Khan Kiryana & General Store"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-ink-secondary flex items-center gap-1 mb-1.5">
                  Business Category
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full h-9 px-3 text-xs bg-canvas text-ink border border-hairline rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                >
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Input
                  label="Store Location / City"
                  id="settings-location"
                  placeholder="e.g. Main Market, Gulberg III, Lahore"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <Input
                  label="What does your store sell?"
                  id="settings-sells"
                  placeholder="e.g. Rice, sugar, flour, tea, cooking oil, dairy, snacks"
                  value={sells}
                  onChange={(e) => setSells(e.target.value)}
                  helperText="Helps the AI voice engine understand your inventory vocabulary."
                />
              </div>
            </div>
          </Card>

          {/* Contact & Linking Info */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <IconDeviceMobile className="w-5 h-5 text-ink-secondary" />
              <div>
                <h3 className="text-sm font-medium text-ink">Linked WhatsApp & Account</h3>
                <p className="text-xs text-ink-mute">Identity details used for orders and WhatsApp alerts.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-surface/50 border border-hairline">
                <span className="text-ink-mute block mb-1">WhatsApp Number</span>
                <span className="font-mono font-medium text-ink">{profile?.whatsappNumber || 'Unlinked'}</span>
              </div>
              <div className="p-3 rounded-lg bg-surface/50 border border-hairline">
                <span className="text-ink-mute block mb-1">Account Email</span>
                <span className="font-mono font-medium text-ink">{profile?.email || 'None'}</span>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={updateProfileMutation.isPending}
              rightIcon={<IconCheck className="w-4 h-4" />}
            >
              Save Store Changes
            </Button>
          </div>
        </form>
      )}

      {/* Tab 2: Pakistani Banks & Payment Methods */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-hairline">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <IconCreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-medium text-ink">Accepted Pakistani Payment Methods</h2>
                  <p className="text-xs text-ink-mute">
                    Choose which payment platforms are active. Only selected methods are offered to your WhatsApp bot.
                  </p>
                </div>
              </div>

              <Badge variant="success" className="self-start sm:self-auto py-1 px-3">
                {activePaymentIds.length} Channels Active
              </Badge>
            </div>

            <div className="space-y-6">
              {/* Cash Section */}
              <div>
                <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-3">
                  Cash in Hand
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {cashMethods.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-medium text-ink">{m.name}</p>
                        <p className="text-[11px] text-ink-mute">{m.nameUrdu}</p>
                      </div>
                      <Badge variant="success">Always On</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Digital Wallets & EMIs */}
              <div>
                <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-3">
                  Digital Wallets & EMIs (SadaPay, NayaPay, Raast, etc.)
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
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                                  Popular
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-ink-mute font-arabic">{m.nameUrdu}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                              isActive ? 'bg-primary text-white' : 'border border-hairline bg-canvas'
                            }`}
                          >
                            {isActive && <IconCheck className="w-3.5 h-3.5 stroke-[3]" />}
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
                              placeholder="Optional Account / IBAN"
                              value={paymentDetails[m.id]?.accountNumber || ''}
                              onChange={(e) =>
                                handlePaymentDetailChange(m.id, 'accountNumber', e.target.value)
                              }
                              className="w-full text-[10px] px-2 py-1 rounded bg-canvas border border-hairline text-ink focus:outline-none focus:ring-1 focus:ring-primary"
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
                  Pakistani Commercial & Islamic Banks (Meezan, HBL, Alfalah, etc.)
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
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                                  Popular
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-ink-mute font-arabic">{m.nameUrdu}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                              isActive ? 'bg-primary text-white' : 'border border-hairline bg-canvas'
                            }`}
                          >
                            {isActive && <IconCheck className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>

                        {isActive && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 pt-2 border-t border-hairline/50"
                          >
                            <input
                              type="text"
                              placeholder="Account Title / IBAN"
                              value={paymentDetails[m.id]?.accountNumber || ''}
                              onChange={(e) =>
                                handlePaymentDetailChange(m.id, 'accountNumber', e.target.value)
                              }
                              className="w-full text-[10px] px-2 py-1 rounded bg-canvas border border-hairline text-ink focus:outline-none focus:ring-1 focus:ring-primary"
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
              rightIcon={<IconCheck className="w-4 h-4" />}
            >
              Save Payment Channels
            </Button>
          </div>
        </div>
      )}

      {/* Tab 3: Voice & Language AI */}
      {activeTab === 'voice' && (
        <form onSubmit={handleSaveVoice} className="space-y-6">
          <Card>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-hairline">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <IconMicrophone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-medium text-ink">Conversational AI Voice Configuration</h2>
                <p className="text-xs text-ink-mute">
                  Control spoken Urdu voice synthesis and how WhatsApp responds to your voice notes.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-secondary flex items-center gap-1 mb-1.5">
                  Default Language
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
                  Voice Note Responses (TTS)
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: 'voice_on_voice',
                      title: 'Voice-on-Voice (Recommended)',
                      desc: 'Bot replies with a spoken voice note only when you send a voice note. Typed text gets a text reply.',
                    },
                    {
                      id: 'always_voice',
                      title: 'Always Voice Note',
                      desc: 'Bot always replies with a spoken voice note, even when you send typed messages.',
                    },
                    {
                      id: 'text_only',
                      title: 'Text Messages Only (Silent)',
                      desc: 'Bot never sends audio notes back, only text messages.',
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

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={updateProfileMutation.isPending}
              rightIcon={<IconCheck className="w-4 h-4" />}
            >
              Save Voice Preferences
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default SettingsPage;
