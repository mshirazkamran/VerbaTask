import { Link } from 'react-router';
import { LandingLayout } from '../components/layout/LandingLayout';
import { FaqList } from '../components/landing/Faq';

const faqs = [
  {
    q: 'What is VerbaTask?',
    a: 'A WhatsApp-first sales and stock tool for small shops in Pakistan. You say a sale in Urdu or English, and it records the order, takes it off your stock and runs any workflows you’ve set up. There’s no separate app.',
  },
  {
    q: 'Do I need to download an app?',
    a: 'No. VerbaTask works inside WhatsApp. The web dashboard is there for charts and detail, but the everyday flow lives in the chat.',
  },
  {
    q: 'What languages are supported?',
    a: 'Urdu and English, written or spoken. Voice notes are transcribed with Whisper, which handles Urdu natively, and you can type in Roman Urdu too.',
  },
  {
    q: 'How do I link my WhatsApp number?',
    a: 'After you sign up with your email you’ll land on the link page. Message the VerbaTask number on WhatsApp, you’ll get a six-digit code, and you enter it with your email to link the number.',
  },
  {
    q: 'Is my data secure?',
    a: 'Passwords are hashed before they’re stored. WhatsApp webhook messages are verified with Meta’s HMAC-SHA256 signatures, and every dashboard request needs a valid JWT.',
  },
  {
    q: 'How do approvals work?',
    a: 'Any order of Rs. 10,000 or more is held until you approve it. You get a WhatsApp message with approve and reject buttons, and the same queue is on the dashboard.',
  },
  {
    q: 'Can I set up automations?',
    a: 'Yes. Workflows can trigger on low stock (“tell me when rice drops below 5”), on keywords in messages, or on a schedule, and they message you on WhatsApp.',
  },
  {
    q: 'Which payment methods are tracked?',
    a: 'Cash, Easypaisa, JazzCash and bank transfers. Every order records how it was paid, and the dashboard shows the split.',
  },
  {
    q: 'Is VerbaTask free?',
    a: 'Yes. It’s free and open source, and the code is on GitHub for anyone to use or contribute to.',
  },
  {
    q: 'How do I get started?',
    a: 'Create an account with your email and a password, follow the WhatsApp linking step, and start saying your sales.',
  },
];

export function FAQPage() {
  return (
    <LandingLayout>
      <section className="py-16 sm:py-24">
        <div className="shell grid gap-10 lg:grid-cols-12 lg:gap-x-10">
          <h1 className="display text-[length:var(--fs-2xl)] text-ink sm:text-[length:var(--text-display)] lg:col-span-7">
            Questions, answered plainly.
          </h1>
          <p className="max-w-[26rem] leading-relaxed text-ink-2 lg:col-span-5 lg:self-end lg:justify-self-end">
            How VerbaTask works, what it costs and how your data is handled. Missing something?{' '}
            <Link to="/contact" className="link-type">
              Ask us
            </Link>
          </p>
          <div className="lg:col-span-8 lg:col-start-5">
            <FaqList items={faqs} />
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}

export default FAQPage;
