export const translations = {
  en: {
    nav: {
      howItWorks: 'How it works',
      features: 'Features',
      pricing: 'Pricing',
      faq: 'FAQ',
      contact: 'Contact',
      signIn: 'Sign in',
      startFree: 'Start free',
    },
    hero: {
      badge: 'WhatsApp · Urdu · Roman Urdu',
      titleBefore: 'Run your shop by ',
      titleHighlight: 'talking',
      titleAfter: ' to it.',
      subtitle:
        'Send a voice note when you make a sale. VerbaTask logs it, takes it off your stock, and asks you only what it couldn’t hear. Built for kiryana stores and pharmacies, not for people who like filling in forms.',
      ctaPrimary: 'Start free on WhatsApp',
      ctaSecondary: 'See how it works',
      hardwareLabel: 'Hardware',
      hardwareVal: 'None',
      setupLabel: 'Setup',
      setupVal: 'One code',
      asksBeforeLabel: 'Asks before',
      asksBeforeVal: 'Rs. 10,000',
      lumenSignal: 'Signal · 0:07',
      lumenParsed: 'Parsed · item · qty · rate · payment',
    },
    voiceLedger: {
      voiceNoteUrdu: 'Voice note · Urdu',
      noteTranscript: '“Do carton Dalda bech diye, cash mil gaya.”',
      orderNum: 'Ord-2842 · 11:15',
      logged: 'Logged',
      itemRow: 'Dalda Oil 5L × 2',
      amount: '5,300',
      paidLabel: 'Paid',
      paidVal: 'Cash',
      stockLeftLabel: 'Stock left',
      stockLeftVal: '3 cartons',
      calloutHeard: 'Heard · Roman Urdu',
      calloutRate: 'Rate · confirmed',
      calloutStock: 'Stock · −2 cartons',
    },
    problem: {
      heading: 'Your shop already runs on WhatsApp. Your records don’t.',
      subheading:
        'Orders come in on WhatsApp and payments get confirmed there all day. Then none of it is written down anywhere you can add up.',
      frictions: [
        {
          title: 'Udhaar lives in someone’s head.',
          body:
            'Who took 5 kg rice on credit? Did the hotel pay for the milk? At closing time it’s memory, a torn bahi-khata, and a total nobody fully trusts.',
          ledger: true,
        },
        {
          title: 'Stock runs out in front of the customer.',
          body:
            'Nobody notices the oil cartons are gone until someone asks for one. Reordering is a guess, and money sits in stock that doesn’t move.',
        },
        {
          title: 'Counter software wasn’t built for this counter.',
          body:
            'Desktop-first, English-only, a form per sale and a barcode gun you don’t own. A busy counter has no time for any of it.',
        },
      ],
      beforeLabel: 'Before · bahi-khata',
      beforeSample: 'Rashid — 1500?? chawal',
      afterLabel: 'After · one voice note',
      afterName: 'Rashid bhai',
      afterDetail: 'udhaar · Rs. 1,500',
    },
    howItWorks: {
      heading: 'Four steps. Three of them happen in WhatsApp.',
      linkCodeLabel: 'Your link code',
      linkCodeHelp: 'Send it to the VerbaTask number on WhatsApp. That’s the whole setup.',
      shelfLive: 'Shelf · live',
      sampleOrder: 'Ord-9021',
      sampleOrderAmount: '18,500',
      sampleOrderPrompt: '10 cartons of oil for Al-Madina Hotel?',
      approvedStatus: 'Approved · stock reserved',
      rejectedStatus: 'Rejected · stock restored',
      undo: 'Undo',
      approveBtn: 'Approve',
      rejectBtn: 'Reject',
      paidByLabel: 'Paid by',
      dayReportLabel: 'Day report on WhatsApp',
      dayReportTime: '10:00 PM',
      rails: [
        { id: 'cash', label: 'Cash' },
        { id: 'easypaisa', label: 'Easypaisa' },
        { id: 'jazzcash', label: 'JazzCash' },
        { id: 'bank', label: 'Bank transfer' },
        { id: 'udhaar', label: 'Udhaar' },
      ],
      stages: [
        {
          num: '1.0',
          word: 'Link',
          title: 'Pair your WhatsApp number.',
          body:
            'Sign up, then send the six-digit code to the VerbaTask number. No app to install, nothing to configure.',
        },
        {
          num: '2.0',
          word: 'Speak',
          title: 'Say the sale the way you’d say it.',
          body:
            'Urdu, Roman Urdu or English, voice or text. If the rate or payment is missing, it asks for that one thing and nothing else.',
        },
        {
          num: '3.0',
          word: 'Sync',
          title: 'Stock moves. Big sales wait for you.',
          body:
            'Every order comes off the shelf count straight away. Anything above your limit waits for your approve or reject, and a rejection puts the stock back.',
        },
        {
          num: '4.0',
          word: 'Close',
          title: 'Close the day against the drawer.',
          body:
            'Each sale is tagged by how the money came in, so cash, wallets and udhaar add up separately. The dashboard has the charts when you want them.',
        },
      ],
    },
    features: {
      title: 'It speaks the way your counter speaks.',
      body:
        'Kiryana words, Roman Urdu spellings, half-English sentences. Tap a line to see what VerbaTask writes down.',
      phrases: [
        { said: 'Do kilo chawal aur ek kilo daal, 500 ka note mila', heard: '2 kg rice · 1 kg daal · cash 500' },
        { said: 'Rashid bhai ne 1500 udhaar liya', heard: 'Rashid · udhaar · Rs. 1,500' },
        { said: 'Do carton Dalda bech diye, cash mil gaya', heard: '2 × Dalda 5L · cash' },
      ],
      everythingElse: 'Everything else',
      capabilities: [
        { name: 'Low-stock alerts', line: 'A WhatsApp ping when an item drops under the level you set.', tag: 'Workflows' },
        { name: 'Approvals above your limit', line: 'Big sales wait for a yes. Rejecting one restores the stock.', tag: 'Approvals' },
        { name: 'Expiry reminders', line: 'Batches nearing their date show up before they become a loss.', tag: 'Inventory' },
        { name: 'Reports in the chat', line: 'Sales, top sellers, full stock, low stock and expiry, sent to WhatsApp.', tag: 'Reports' },
        { name: 'Read-back on every entry', line: 'Each sale is repeated to you. Reply GALAT and it’s reversed.', tag: 'Safety' },
        { name: 'A dashboard when you want one', line: 'Charts, orders and inventory on the web. Optional, never required.', tag: 'Web' },
      ],
    },
    whyWhatsApp: {
      heading: 'A desktop till, or the phone already in your hand.',
      subheading:
        'Shop software fails when it asks shopkeepers to sit behind a machine. VerbaTask works in the chat app you already have open all day.',
      headers: {
        counter: 'At the counter',
        pos: 'Desktop POS',
        vt: 'VerbaTask on WhatsApp',
      },
      rows: [
        {
          need: 'Hardware',
          pos: 'Rs. 45,000–120,000 for a PC, touch terminal and barcode gun',
          vt: 'Nothing new. Any Android phone with WhatsApp',
        },
        {
          need: 'Language',
          pos: 'English-only screens, a form per checkout',
          vt: 'Urdu and Roman Urdu voice notes, spoken like you’d talk to staff',
        },
        {
          need: 'Loadshedding',
          pos: 'Needs a UPS or generator to keep the terminal on',
          vt: 'Runs on phone battery and mobile data',
        },
        {
          need: 'Training',
          pos: 'Weeks of cashier training; mistakes end up in the stock count',
          vt: 'If staff can send a voice note, they can use it',
        },
      ],
    },
    pricing: {
      badge: 'Early Access · Free Trial',
      heading: 'Simple, Honest Pricing',
      subheading:
        'Tailored specifically for Pakistani retail merchants. Start with our full-featured free trial — subscription plans rolling out soon.',
      description:
        'Everything your store needs to log daily sales, manage inventory, and track customer Khata purely through WhatsApp voice notes.',
      included: [
        'Unlimited sales by voice note or text',
        'Multi-staff WhatsApp linking (Shop Code for 3–5 assistants)',
        'Live stock with low-stock alerts',
        'Customer Khata ledger & payment reminders',
        'Cash, Easypaisa, JazzCash, bank and udhaar',
        'Approvals for sales above your limit',
        'Web dashboard and WhatsApp reports',
        'No credit card required to start',
      ],
      cta: 'Start Free Trial',
      note: 'Setup takes less than a minute.',
    },
    faq: {
      heading: 'Questions shopkeepers ask.',
      subheading: 'Something else on your mind?',
      writeToUs: 'Write to us',
      items: [
        {
          q: 'Do I have to change how I run my counter?',
          a: 'No. You serve customers the way you do today. The only new habit is a quick voice note or text to the VerbaTask chat: “2 carton oil bech diye, cash mil gaya.”',
        },
        {
          q: 'What if it gets an amount or item wrong?',
          a: 'Every entry is read back to you with the item, quantity, rate and total. If anything is off, reply GALAT or type the correction and it’s reversed. Sales above your limit wait for your approval before they’re recorded.',
        },
        {
          q: 'Does it really understand Roman Urdu and mixed sentences?',
          a: 'Yes. “Do kilo chawal aur ek kilo daal, 500 ka note mila” becomes items, quantities and a cash payment. Urdu voice notes are transcribed and matched against your own inventory list.',
        },
        {
          q: 'Who can see my sales and stock?',
          a: 'Only you, and anyone you give dashboard access to. Your records are tied to your verified WhatsApp number and are never shared or sold.',
        },
        {
          q: 'Do I need the web dashboard?',
          a: 'No. The WhatsApp chat handles daily sales and stock checks on its own. The dashboard is there when you want charts, printable reports or to manage payment methods.',
        },
        {
          q: 'What if my phone loses signal?',
          a: 'WhatsApp holds your message and sends it when the signal comes back. VerbaTask then processes messages in order, so nothing is skipped.',
        },
      ],
    },
    finalCta: {
      heading: 'Send one voice note. Close the day with a clean ledger.',
      ctaPrimary: 'Start free on WhatsApp',
      ctaSecondary: 'Sign in to your dashboard',
      footerDesc: 'Voice-first sales and stock for shops in Pakistan. Lahore · Karachi · Rawalpindi.',
      faq: 'FAQ',
      contact: 'Contact',
      email: 'Email',
      github: 'GitHub',
      copyright: 'VerbaTask · open source',
    },
    topBar: {
      overview: 'Overview',
      inventory: 'Inventory',
      orders: 'Orders',
      ledger: 'Ledger (Khata)',
      workflows: 'Workflows',
      approvals: 'Approvals',
      settings: 'Shop settings',
      live: 'Live',
      site: 'Site',
    },
  },

  ur: {
    nav: {
      howItWorks: 'طریقہ کار',
      features: 'خصوصیات',
      pricing: 'قیمتیں',
      faq: 'عام سوالات',
      contact: 'رابطہ',
      signIn: 'لاگ اِن',
      startFree: 'مفت شروع کریں',
    },
    hero: {
      badge: 'واٹس ایپ · اردو · رومن اردو',
      titleBefore: 'اپنی دکان چلائیں صرف ',
      titleHighlight: 'بول',
      titleAfter: ' کر۔',
      subtitle:
        'جب بھی کوئی چیز فروخت ہو، بس ایک وائس نوٹ بھیجیں۔ وربا ٹاسک اسے درج کرے گا، اسٹاک سے کم کرے گا، اور صرف وہی پوچھے گا جو سمجھ نہ آیا ہو۔ کریانہ اسٹورز اور میڈیکل اسٹورز کے لیے، فارم بھرنے کی جھنجھٹ کے بغیر۔',
      ctaPrimary: 'واٹس ایپ پر مفت شروع کریں',
      ctaSecondary: 'طریقہ کار دیکھیں',
      hardwareLabel: 'ہارڈ ویئر',
      hardwareVal: 'کوئی نہیں',
      setupLabel: 'سیٹ اپ',
      setupVal: 'صرف ایک کوڈ',
      asksBeforeLabel: 'تصدیق کی حد',
      asksBeforeVal: '10,000 روپے',
      lumenSignal: 'آواز کا سگنل · 0:07',
      lumenParsed: 'پڑھا گیا · آئٹم · تعداد · ریٹ · ادائیگی',
    },
    voiceLedger: {
      voiceNoteUrdu: 'وائس نوٹ · اردو',
      noteTranscript: '“دو کاٹن ڈالڈا بیچ دیے، کیش مل گیا۔”',
      orderNum: 'آرڈر-2842 · 11:15',
      logged: 'درج شدہ',
      itemRow: 'ڈالڈا آئل 5 لیٹر × 2',
      amount: '5,300',
      paidLabel: 'ادائیگی',
      paidVal: 'نقد (کیش)',
      stockLeftLabel: 'بقیہ اسٹاک',
      stockLeftVal: '3 کاٹن',
      calloutHeard: 'سنا گیا · رومن اردو',
      calloutRate: 'ریٹ · تصدیق شدہ',
      calloutStock: 'اسٹاک · −2 کاٹن',
    },
    problem: {
      heading: 'آپ کی دکان پہلے ہی واٹس ایپ پر چلتی ہے۔ آپ کا کھاتہ نہیں۔',
      subheading:
        'دن بھر آرڈرز واٹس ایپ پر آتے ہیں اور ادائیگیاں تصدیق ہوتی ہیں۔ لیکن بعد میں ان کا کوئی ایسا باقاعدہ حساب نہیں ہوتا جسے آسانی سے جوڑا جا سکے۔',
      frictions: [
        {
          title: 'ادھار کسی کے ذہن میں رہ جاتا ہے۔',
          body:
            'کس نے ادھار پر 5 کلو چاول لیے؟ کیا ہوٹل والے نے دودھ کے پیسے دیے؟ دکان بند کرتے وقت صرف یادداشت، ایک پھٹا ہوا بہی کھاتہ، اور ایسا ٹوٹل جس پر پورا بھروسہ نہ ہو۔',
          ledger: true,
        },
        {
          title: 'گاہک کے سامنے سامان ختم ہو جاتا ہے۔',
          body:
            'تیل کے کاٹن ختم ہونے کا تب تک پتہ نہیں چلتا جب تک کوئی گاہک مانگ نہ لے۔ دوبارہ آرڈر دینا ایک اندازہ ہے، اور پیسہ اس مال میں پھنسا رہتا ہے جو بکتا ہی نہیں۔',
        },
        {
          title: 'کاؤنٹر سافٹ ویئر اس کاؤنٹر کے لیے نہیں بنے تھے۔',
          body:
            'کمپیوٹر کی پابندی، صرف انگریزی زبان، ہر فروخت پر فارم اور بارکوڈ گن جو آپ کے پاس نہیں۔ ایک مصروف کاؤنٹر کے پاس اس سب کا وقت نہیں ہوتا۔',
        },
      ],
      beforeLabel: 'پہلے · بہی کھاتہ',
      beforeSample: 'راشد — 1500؟؟ چاول',
      afterLabel: 'بعد میں · صرف ایک وائس نوٹ',
      afterName: 'راشد بھائی',
      afterDetail: 'ادھار · 1,500 روپے',
    },
    howItWorks: {
      heading: 'چار آسان مراحل۔ جن میں سے تین واٹس ایپ کے اندر ہوتے ہیں۔',
      linkCodeLabel: 'آپ کا لنک کوڈ',
      linkCodeHelp: 'یہ کوڈ واٹس ایپ پر وربا ٹاسک کے نمبر پر بھیجیں۔ بس سیٹ اپ مکمل۔',
      shelfLive: 'دکان کا اسٹاک · لائیو',
      sampleOrder: 'آرڈر-9021',
      sampleOrderAmount: '18,500',
      sampleOrderPrompt: 'المدینہ ہوٹل کے لیے 10 کاٹن آئل درج کریں؟',
      approvedStatus: 'منظور شدہ · اسٹاک محفوظ ہو گیا',
      rejectedStatus: 'مسترد شدہ · اسٹاک واپس شامل ہو گیا',
      undo: 'واپس لیں',
      approveBtn: 'منظور کریں',
      rejectBtn: 'مسترد کریں',
      paidByLabel: 'ادائیگی کا ذریعہ',
      dayReportLabel: 'روزانہ رپورٹ بذریعہ واٹس ایپ',
      dayReportTime: '10:00 PM',
      rails: [
        { id: 'cash', label: 'نقد (کیش)' },
        { id: 'easypaisa', label: 'ایزی پیسہ' },
        { id: 'jazzcash', label: 'جاز کیش' },
        { id: 'bank', label: 'بینک ٹرانسفر' },
        { id: 'udhaar', label: 'ادھار' },
      ],
      stages: [
        {
          num: '1.0',
          word: 'جوڑیں',
          title: 'اپنا واٹس ایپ نمبر منسلک کریں۔',
          body:
            'اکاؤنٹ بنائیں، پھر چھ ہندسوں کا کوڈ وربا ٹاسک نمبر پر بھیجیں۔ نہ کوئی ایپ انسٹال کرنی ہے، نہ کوئی پیچیدہ سیٹنگ۔',
        },
        {
          num: '2.0',
          word: 'بولیں',
          title: 'سیل ایسے بولیں جیسے آپ عام بات کرتے ہیں۔',
          body:
            'اردو، رومن اردو یا انگریزی، آواز میں یا لکھ کر۔ اگر ریٹ یا ادائیگی رہ گئی ہو، تو سسٹم صرف وہی ایک بات پوچھے گا۔',
        },
        {
          num: '3.0',
          word: 'ہم آہنگی',
          title: 'اسٹاک فوراً اپڈیٹ۔ بڑی سیل آپ کی اجازت کی منتظر۔',
          body:
            'ہر آرڈر فوراً شیلف کی تعداد سے کم ہو جاتا ہے۔ آپ کی مقررہ حد سے بڑی فروخت آپ کی منظوری کی منتظر رہتی ہے۔',
        },
        {
          num: '4.0',
          word: 'حساب کتاب',
          title: 'دن کے اختتام پر گلے کا مکمل حساب۔',
          body:
            'ہر فروخت رقم کی وصولی کے طریقے کے مطابق ٹیگ ہوتی ہے: کیش، بٹوے اور ادھار الگ الگ جمع ہوتے ہیں۔',
        },
      ],
    },
    features: {
      title: 'یہ وہی زبان سمجھتا ہے جو آپ کے کاؤنٹر پر بولی جاتی ہے۔',
      body:
        'کریانے کے الفاظ، رومن اردو، یا آدھے انگریزی جملے۔ کسی بھی لائن پر کلک کر کے دیکھیں کہ وربا ٹاسک اسے کیسے لکھتا ہے۔',
      phrases: [
        { said: 'دو کلو چاول اور ایک کلو دال، 500 کا نوٹ ملا', heard: '2 کلو چاول · 1 کلو دال · کیش 500' },
        { said: 'راشد بھائی نے 1500 ادھار لیا', heard: 'راشد · ادھار · 1,500 روپے' },
        { said: 'دو کاٹن ڈالڈا بیچ دیے، کیش مل گیا', heard: '2 × ڈالڈا 5 لیٹر · کیش' },
      ],
      everythingElse: 'دیگر تمام خصوصیات',
      capabilities: [
        { name: 'کم اسٹاک کے الرٹس', line: 'جب کوئی سامان آپ کی مقرر کردہ حد سے کم ہو تو واٹس ایپ پر الرٹ ملتا ہے۔', tag: 'ورک فلو' },
        { name: 'مقررہ حد سے زیادہ کی منظوری', line: 'بڑی فروخت آپ کی اجازت کی منتظر رہتی ہے۔ مسترد کرنے پر اسٹاک بحال ہو جاتا ہے۔', tag: 'منظوری' },
        { name: 'ایکسپائری کی یاد دہانی', line: 'قریبی تاریخ والی اشیاء نقصان بننے سے پہلے الرٹ میں ظاہر ہو جاتی ہیں۔', tag: 'انوینٹری' },
        { name: 'چیٹ میں مکمل رپورٹس', line: 'سیل، ٹاپ آئٹمز، مکمل اسٹاک، کم اسٹاک اور ایکسپائری—سب واٹس ایپ پر۔', tag: 'رپورٹس' },
        { name: 'ہر اندراج کی فوری واپسی تصدیق', line: 'ہر سیل آپ کو پڑھ کر سنائی جاتی ہے۔ "GALAT" لکھنے پر فوراً منسوخ ہو جاتی ہے۔', tag: 'حفاظت' },
        { name: 'ضرورت پڑنے پر ویب ڈیش بورڈ', line: 'چارٹس، آرڈرز اور انوینٹری ویب پر دیکھیں۔ اختیاری ہے، کبھی لازمی نہیں۔', tag: 'ویب پورٹل' },
      ],
    },
    whyWhatsApp: {
      heading: 'ڈیسک ٹاپ کمپیوٹر، یا وہی موبائل جو پہلے ہی آپ کے ہاتھ میں ہے؟',
      subheading:
        'دکان کا سافٹ ویئر اس وقت ناکام ہوتا ہے جب وہ دکاندار سے کمپیوٹر کے پیچھے بیٹھنے کا تقاضا کرتا ہے۔ وربا ٹاسک اسی ایپ میں کام کرتا ہے جو آپ کے فون پر سارا دن کھلی رہتی ہے۔',
      headers: {
        counter: 'کاؤنٹر پر ضرورت',
        pos: 'ڈیسک ٹاپ پی او ایس (POS)',
        vt: 'واٹس ایپ پر وربا ٹاسک',
      },
      rows: [
        {
          need: 'ہارڈ ویئر',
          pos: 'پی سی، ٹچ اسکرین اور بارکوڈ گن کے لیے 45,000 سے 120,000 روپے',
          vt: 'کوئی نیا خرچ نہیں۔ واٹس ایپ والا کوئی بھی اینڈرائیڈ فون',
        },
        {
          need: 'زبان',
          pos: 'صرف انگریزی اسکرینیں، ہر سیل پر نیا فارم',
          vt: 'اردو اور رومن اردو وائس نوٹس، جیسے آپ ملازم سے بات کرتے ہیں',
        },
        {
          need: 'لوڈ شیڈنگ',
          pos: 'کمپیوٹر کو آن رکھنے کے لیے یو پی ایس یا جنریٹر کی ضرورت',
          vt: 'موبائل بیٹری اور موبائل ڈیٹا پر بلا تعطل چلتا ہے',
        },
        {
          need: 'تربیت',
          pos: 'کیشیئر کی ہفتوں کی ٹریننگ، غلطیوں سے اسٹاک خراب',
          vt: 'اگر عملہ وائس نوٹ بھیج سکتا ہے، تو وہ اسے باآسانی استعمال کر سکتا ہے',
        },
      ],
    },
    pricing: {
      badge: 'ابتدائی رسائی · مفت ٹرائل',
      heading: 'آسان اور شفاف قیمت',
      subheading:
        'خاص طور پر پاکستانی ریٹیل دکانداروں کے لیے تیار کردہ۔ ہمارے مکمل فیچرز والے مفت ٹرائل سے شروع کریں — سبسکرپشن پلانز جلد آرہے ہیں۔',
      description:
        'آپ کی دکان کو روزانہ کی فروخت درج کرنے، انوینٹری سنبھالنے اور کسٹمر کھاتہ ٹریک کرنے کے لیے درکار تمام سہولیات، صرف واٹس ایپ وائس نوٹس کے ذریعے۔',
      included: [
        'وائس نوٹ یا میسج کے ذریعے لامحدود سیلز',
        'متعدد عملے کا واٹس ایپ لنک (3 سے 5 ملازمین کے لیے شاپ کوڈ)',
        'کم اسٹاک کے فوری الرٹس کے ساتھ لائیو انوینٹری',
        'کسٹمر کھاتہ لیجر اور ادھار کی وصولی کے پیغامات',
        'کیش، ایزی پیسہ، جاز کیش، بینک اور ادھار کی سپورٹ',
        'مقررہ حد سے زیادہ کی بڑی سیلز پر تصدیقی منظوری',
        'ویب ڈیش بورڈ اور واٹس ایپ پر روزانہ کی رپورٹس',
        'شروع کرنے کے لیے کسی کریڈٹ کارڈ کی ضرورت نہیں',
      ],
      cta: 'مفت ٹرائل شروع کریں',
      note: 'سیٹ اپ میں ایک منٹ سے بھی کم وقت لگتا ہے۔',
    },
    faq: {
      heading: 'دکانداروں کے عام سوالات۔',
      subheading: 'کیا آپ کے ذہن میں کچھ اور ہے؟',
      writeToUs: 'ہم سے رابطہ کریں',
      items: [
        {
          q: 'کیا مجھے دکان چلانے کا اپنا انداز بدلنا پڑے گا؟',
          a: 'ہرگز نہیں۔ آپ گاہکوں کو اسی طرح سامان دیں جیسے آج دیتے ہیں۔ صرف ایک نئی عادت ہے: وربا ٹاسک چیٹ پر ایک چھوٹا سا وائس نوٹ یا میسج: "2 کاٹن آئل بیچ دیے، کیش مل گیا۔"',
        },
        {
          q: 'اگر اس نے کوئی رقم یا سامان غلط لکھ لیا تو؟',
          a: 'ہر اندراج پر آپ کو سامان، تعداد، ریٹ اور کل رقم کا جواب دیا جاتا ہے۔ اگر کچھ غلط ہو تو صرف "GALAT" لکھ کر بھیجیں اور وہ فوراً منسوخ ہو جاتا ہے۔ بڑی رقم کے آرڈرز آپ کی اجازت کے منتظر رہتے ہیں۔',
        },
        {
          q: 'کیا یہ واقعی رومن اردو اور ملے جلے جملے سمجھتا ہے؟',
          a: 'جی ہاں۔ "دو کلو چاول اور ایک کلو دال، 500 کا نوٹ ملا" کو یہ سامان، مقدار اور کیش کی ادائیگی میں بدل دیتا ہے۔ اردو وائس نوٹس کو سن کر آپ کی انوینٹری سے ملا لیا جاتا ہے۔',
        },
        {
          q: 'میری فروخت اور اسٹاک کا ریکارڈ کون دیکھ سکتا ہے؟',
          a: 'صرف آپ، اور وہ جنہیں آپ ڈیش بورڈ کی رسائی دیں۔ آپ کا ریکارڈ آپ کے تصدیق شدہ واٹس ایپ نمبر سے محفوظ رہتا ہے اور کسی کے ساتھ شیئر نہیں کیا جاتا۔',
        },
        {
          q: 'کیا مجھے ویب ڈیش بورڈ کی ضرورت ہے؟',
          a: 'نہیں۔ واٹس ایپ چیٹ روزانہ کی فروخت اور اسٹاک کا کام خود سنبھال لیتی ہے۔ ڈیش بورڈ صرف اس وقت ہے جب آپ چارٹس دیکھنا چاہیں یا پرنٹ نکالنا چاہیں۔',
        },
        {
          q: 'اگر فون کے سگنل چلے جائیں تو کیا ہوگا؟',
          a: 'واٹس ایپ آپ کا پیغام محفوظ رکھتا ہے اور سگنل واپس آنے پر خود بخود بھیج دیتا ہے۔ وربا ٹاسک پیغامات کو ترتیب سے پروسیس کرتا ہے، لہذا کوئی چیز ضائع نہیں ہوتی۔',
        },
      ],
    },
    finalCta: {
      heading: 'ایک وائس نوٹ بھیجیں۔ اور دن کے اختتام پر صاف شفاف کھاتہ پائیں۔',
      ctaPrimary: 'واٹس ایپ پر مفت شروع کریں',
      ctaSecondary: 'اپنے ڈیش بورڈ میں لاگ اِن ہوں',
      footerDesc: 'پاکستان کی دکانوں کے لیے آواز پر مبنی سیلز اور اسٹاک مینیجمنٹ۔ لاہور · کراچی · راولپنڈی۔',
      faq: 'عام سوالات',
      contact: 'رابطہ',
      email: 'ای میل',
      github: 'گٹ ہب',
      copyright: 'وربا ٹاسک · اوپن سورس',
    },
    topBar: {
      overview: 'جائزہ',
      inventory: 'اسٹاک (انوینٹری)',
      orders: 'آرڈرز',
      ledger: 'کھاتہ لیجر',
      workflows: 'ورک فلووز',
      approvals: 'منظوریاں',
      settings: 'دکان کی سیٹنگز',
      live: 'لائیو',
      site: 'مین ویب سائٹ',
    },
  },
};

export function getTranslations(lang) {
  return translations[lang] || translations.en;
}
