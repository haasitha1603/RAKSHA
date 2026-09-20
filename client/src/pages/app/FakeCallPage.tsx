import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PhoneCall,
  Play,
  Square,
  Clock,
  Shield,
  Plus,
  Trash2,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { apiFetch } from '../../lib/api.js';
import { audioSynthesizer } from '../../lib/audio.js';
import { FakeCallRow } from '@raksha/shared';
import { Helmet } from 'react-helmet-async';
import { EmptyState } from '../../components/common/EmptyState.js';

const CALLER_PRESETS = [
  { name: 'Mom', number: '+91 98765 43210', color: '#4338CA' },
  { name: 'Dad', number: '+91 98765 43211', color: '#1E40AF' },
  { name: 'Brother', number: '+91 98765 43212', color: '#047857' },
  { name: 'Sister', number: '+91 98765 43213', color: '#B45309' },
  { name: 'Friend', number: '+91 98765 43214', color: '#7C3AED' },
  { name: 'Boss', number: '+91 98765 43215', color: '#374151' },
  { name: 'Cab Driver', number: '+91 98765 43216', color: '#D97706' },
];

export const LANGUAGE_OPTIONS = [
  { id: 'en-IN', label: 'English (India)', native: 'English' },
  { id: 'hi-IN', label: 'Hindi', native: 'हिन्दी' },
  { id: 'hinglish', label: 'Hinglish (Urban Mix)', native: 'Hinglish' },
  { id: 'pa-IN', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { id: 'ta-IN', label: 'Tamil', native: 'தமிழ்' },
  { id: 'te-IN', label: 'Telugu', native: 'తెలుగు' },
  { id: 'bn-IN', label: 'Bengali', native: 'বাংলা' },
  { id: 'mr-IN', label: 'Marathi', native: 'मराठी' },
];

export interface ScriptOption {
  id: string;
  name: string;
  lines: { line: string; pauseSeconds: number }[];
}

export const MULTILINGUAL_SCRIPTS: Record<string, ScriptOption[]> = {
  'en-IN': [
    {
      id: 'en_mom',
      name: 'Mom — Checking in & waiting outside',
      lines: [
        { line: 'Hello beta, where are you right now? It is getting quite late.', pauseSeconds: 4 },
        { line: 'Are you still on the main road? Is there proper street lighting there?', pauseSeconds: 3.5 },
        { line: 'I was thinking, should your brother come meet you at the intersection with the car?', pauseSeconds: 4 },
        { line: 'Alright, keep the phone on speaker and keep walking towards the gate.', pauseSeconds: 3.5 },
        { line: 'I am standing on the balcony watching the road right now. Can you see our building?', pauseSeconds: 4 },
        { line: 'Okay, do not hang up until you come inside. See you in two minutes.', pauseSeconds: 2 },
      ],
    },
    {
      id: 'en_dad',
      name: 'Dad — Car waiting at the crossing',
      lines: [
        { line: 'Hey, I have parked the car right near the traffic signal crossing.', pauseSeconds: 4 },
        { line: 'Did you leave the office or are you walking out right now?', pauseSeconds: 3.5 },
        { line: 'Keep straight on the well-lit pavement, do not take the narrow lane.', pauseSeconds: 3.5 },
        { line: 'I have my hazard lights flashing so you can spot the car easily.', pauseSeconds: 4 },
        { line: 'Can you see the white sedan parked next to the bank?', pauseSeconds: 3.5 },
        { line: 'Yes, I see you waving. Come on in, the doors are unlocked.', pauseSeconds: 2 },
      ],
    },
    {
      id: 'en_friend',
      name: 'Friend — Waiting at the venue gate',
      lines: [
        { line: 'Hey, where have you reached? All of us are standing right outside.', pauseSeconds: 3.5 },
        { line: 'Is your cab stuck in traffic or are you already walking up the lane?', pauseSeconds: 4 },
        { line: 'Rahul and Sneha just reached as well. We saved a table right by the entrance.', pauseSeconds: 4 },
        { line: 'Should one of us walk over to the corner to walk with you?', pauseSeconds: 3.5 },
        { line: 'Okay cool, keep talking so I know when you are turning into the lane.', pauseSeconds: 3.5 },
        { line: 'Awesome, I think I see you right there. Hurry over!', pauseSeconds: 2 },
      ],
    },
    {
      id: 'en_boss',
      name: 'Manager — Urgent client conference call',
      lines: [
        { line: 'Hi, sorry to ring so late, but the leadership team needs an urgent sync on the deployment.', pauseSeconds: 4 },
        { line: 'Are you in a spot where you can step into a quiet corner and review the alert?', pauseSeconds: 3.5 },
        { line: 'We have the client engineering lead on the line waiting for our sign-off.', pauseSeconds: 4 },
        { line: 'Could you confirm if you have your laptop accessible right now or within ten minutes?', pauseSeconds: 3.5 },
        { line: 'Understood. Please excuse yourself immediately and join the bridge link I just messaged.', pauseSeconds: 3 },
        { line: 'Thanks for stepping out quickly. Joining the bridge now.', pauseSeconds: 2 },
      ],
    },
  ],
  'hi-IN': [
    {
      id: 'hi_mom',
      name: 'माँ — घर पहुँचने का इंतज़ार (Mom checking in)',
      lines: [
        { line: 'हाँ बेटा, कहाँ तक पहुँचे? बहुत देर हो गई है, मुझे चिंता हो रही थी।', pauseSeconds: 4 },
        { line: 'मेन रोड से ही आ रहे हो ना? वहाँ स्ट्रीट लाइट्स जल रही हैं ठीक से?', pauseSeconds: 3.5 },
        { line: 'भैया को बोलूँ क्या? वो स्कूटी लेके मेन चौराहे तक आ जाएगा तुम्हें लेने।', pauseSeconds: 4 },
        { line: 'अच्छा ठीक है, फोन काटना मत, बात करते-करते ही सीधे घर की तरफ आओ।', pauseSeconds: 3.5 },
        { line: 'मैं बालकनी से देख रही हूँ, कॉलोनी का गेट खुला हुआ है।', pauseSeconds: 3.5 },
        { line: 'हाँ दिख गए तुम, चलो जल्दी अंदर आ जाओ, दरवाज़ा खुला है।', pauseSeconds: 2 },
      ],
    },
    {
      id: 'hi_dad',
      name: 'पापा — गाड़ी लेकर मोड़ पर खड़े हैं (Dad at crossing)',
      lines: [
        { line: 'नमस्ते बेटा, मैं गाड़ी लेके मेन रोड वाले मोड़ पर खड़ा हूँ।', pauseSeconds: 4 },
        { line: 'तुम मेट्रो स्टेशन से निकल गए या अभी पैदल आ रहे हो?', pauseSeconds: 3.5 },
        { line: 'अकेले मत आना उस सुनसान गली से, सीधे बड़े रास्ते से ही मोड़ पर आओ।', pauseSeconds: 4 },
        { line: 'मैंने गाड़ी की पार्किंग लाइट ऑन कर रखी है ताकि तुम्हें दूर से दिख जाए।', pauseSeconds: 3.5 },
        { line: 'हाँ, लाल बत्ती के पास ही खड़ा हूँ। कितने मिनट लगेंगे तुम्हें?', pauseSeconds: 3.5 },
        { line: 'ठीक है, मैं यहीं इंतज़ार कर रहा हूँ, आराम से ध्यान से आओ।', pauseSeconds: 2 },
      ],
    },
    {
      id: 'hi_friend',
      name: 'दोस्त — गेट के पास खड़े हैं (Friend at entrance)',
      lines: [
        { line: 'अरे कहाँ रह गए भाई? हम सब कब से मेन गेट पर इंतज़ार कर रहे हैं।', pauseSeconds: 3.5 },
        { line: 'तुम्हारी ऑटो पहुँची या पैदल आ रहे हो? रास्ता तो ठीक है ना वहाँ?', pauseSeconds: 4 },
        { line: 'अमन भी यहीं खड़ा है, बोल रहा है आगे तक आके तुम्हें रिसीव कर ले।', pauseSeconds: 3.5 },
        { line: 'चलो फोन चालू रखो, बिल्कुल भी अकेले मत रुको वहाँ।', pauseSeconds: 4 },
        { line: 'हाँ बस सामने ही खड़े हैं, नीली टी-शर्ट में अमन दिख रहा है ना?', pauseSeconds: 3.5 },
        { line: 'चल बढ़िया, फटाफट आ जा अंदर!', pauseSeconds: 2 },
      ],
    },
  ],
  'hinglish': [
    {
      id: 'hinglish_mom',
      name: 'Mom — Where have you reached? (Hinglish)',
      lines: [
        { line: 'Hey beta, kahan tak pahuche? It is getting quite late.', pauseSeconds: 4 },
        { line: 'Main road pe hi ho na? Street lights properly on hain wahan?', pauseSeconds: 3.5 },
        { line: 'Bhaiya ko bolu kya bike leke crossing tak aa jaye pick karne?', pauseSeconds: 4 },
        { line: 'Theek hai, phone mat kaatna. Speaker pe rakho aur continuously baat karo.', pauseSeconds: 3.5 },
        { line: 'Main balcony se watch kar rahi hoon, main gate open hai.', pauseSeconds: 4 },
        { line: 'Haan, I can see you coming. Jaldi aao andar safe!', pauseSeconds: 2 },
      ],
    },
    {
      id: 'hinglish_colleague',
      name: 'Colleague — Urgent escalations call',
      lines: [
        { line: 'Hey, sorry to disturb you this late, but prod server pe issue aa gaya hai.', pauseSeconds: 4 },
        { line: 'Can you excuse yourself right now and check the urgent slack ping?', pauseSeconds: 3.5 },
        { line: 'Team call already chal rahi hai, we really need your input on this.', pauseSeconds: 4 },
        { line: 'Are you somewhere quiet where you can take this call for 5 minutes?', pauseSeconds: 3.5 },
        { line: 'Great, join the meeting link immediately please, waiting for you.', pauseSeconds: 2 },
      ],
    },
  ],
  'pa-IN': [
    {
      id: 'pa_family',
      name: 'ਘਰੋਂ ਫੋਨ — ਕਿੱਥੇ ਤੱਕ ਪਹੁੰਚੇ (Home check-in)',
      lines: [
        { line: 'ਹਾਂਜੀ ਪੁੱਤ, ਕਿੱਥੇ ਤੱਕ ਪਹੁੰਚ ਗਏ? ਬੜਾ ਟਾਈਮ ਹੋ ਗਿਆ ਹੈ।', pauseSeconds: 4 },
        { line: 'ਮੇਨ ਸੜਕ ਤੇ ਹੀ ਆ ਰਹੇ ਹੋ ਨਾ? ਉੱਥੇ ਲਾਈਟਾਂ ਠੀਕ ਚੱਲ ਰਹੀਆਂ ਨੇ?', pauseSeconds: 3.5 },
        { line: 'ਮੈਂ ਵੱਡੇ ਵੀਰ ਨੂੰ ਸਕੂਟਰ ਲੈ ਕੇ ਮੋੜ ਤੇ ਭੇਜਾਂ ਤੁਹਾਨੂੰ ਲੈਣ ਲਈ?', pauseSeconds: 4 },
        { line: 'ਚਲੋ ਠੀਕ ਹੈ, ਫੋਨ ਨਾ ਕੱਟਣਾ, ਗੱਲ ਕਰਦੇ-ਕਰਦੇ ਸਿੱਧਾ ਘਰ ਵੱਲ ਆਓ।', pauseSeconds: 3.5 },
        { line: 'ਮੈਂ ਬਾਹਰ ਗੇਟ ਤੇ ਹੀ ਖੜ੍ਹਾ ਹਾਂ, ਕਿੰਨਾ ਸਮਾਂ ਲੱਗੇਗਾ ਹੋਰ?', pauseSeconds: 3.5 },
        { line: 'ਹਾਂਜੀ ਦਿਖ ਗਏ ਹੋ ਤੁਸੀਂ, ਚਲੋ ਛੇਤੀ ਅੰਦਰ ਆ ਜਾਓ।', pauseSeconds: 2 },
      ],
    },
  ],
  'ta-IN': [
    {
      id: 'ta_family',
      name: 'அம்மா — எங்கே வந்திருக்கீங்க? (Mother check-in)',
      lines: [
        { line: 'ஹலோ, எங்க வரைக்கும் வந்திருக்கீங்க? ரொம்ப நேரம் ஆயிடுச்சு, பயமா இருக்கு.', pauseSeconds: 4 },
        { line: 'மெயின் ரோடு வழியா தான் வரீங்களா? வெளிச்சம் சரியா இருக்கா அங்க?', pauseSeconds: 3.5 },
        { line: 'தம்பிய வண்டி எடுத்துட்டு சிக்னல் வரைக்கும் வரச் சொல்லவா உங்களை கூட்டிட்டு வர?', pauseSeconds: 4 },
        { line: 'சரிங்க, போனை கட் பண்ணாதீங்க. பேசிக்கிட்டே சீக்கிரம் வாங்க.', pauseSeconds: 3.5 },
        { line: 'நான் பால்கனில இருந்து பாத்துட்டே இருக்கேன். கேட் திறந்து தான் இருக்கு.', pauseSeconds: 3.5 },
        { line: 'ஆமா பாத்துட்டேன், பத்திரமா சீக்கிரம் உள்ள வாங்க.', pauseSeconds: 2 },
      ],
    },
  ],
  'te-IN': [
    {
      id: 'te_family',
      name: 'అమ్మ — ఎక్కడి దాకా వచ్చావు? (Mother check-in)',
      lines: [
        { line: 'హలో, ఎక్కడి దాకా వచ్చావు నాన్నా? చాలా లేట్ అయిపోయింది, కంగారుగా ఉంది.', pauseSeconds: 4 },
        { line: 'మెయిన్ రోడ్డు మీదే వస్తున్నావా? అక్కడ వీధి దీపాలు వెలుగుతున్నాయా?', pauseSeconds: 3.5 },
        { line: 'తమ్ముడిని బండి మీద జంక్షన్ వరకు రమ్మంటావా నిన్ను తీసుకురావడానికి?', pauseSeconds: 4 },
        { line: 'సరే, ఫోన్ కట్ చేయకుండా మాట్లాడుతూనే త్వరగా ఇంటికి రా.', pauseSeconds: 3.5 },
        { line: 'నేను గేటు దగ్గరే నిలబడి చూస్తున్నాను. ఇంకా ఎంత సమయం పడుతుంది?', pauseSeconds: 3.5 },
        { line: 'అవును కనిపించావు, త్వరగా లోపలికి వచ్చేయ్ జాగ్రత్తగా.', pauseSeconds: 2 },
      ],
    },
  ],
  'bn-IN': [
    {
      id: 'bn_family',
      name: 'মা — কোথায় পৌঁছালে? (Mother check-in)',
      lines: [
        { line: 'হ্যালো, কোথায় পৌঁছালে? অনেক রাত হয়ে গেছে কিন্তু, চিন্তা হচ্ছে খুব।', pauseSeconds: 4 },
        { line: 'মেন রাস্তা দিয়ে আসছ তো? ওখানে আলো ঠিকঠাক জ্বলছে তো?', pauseSeconds: 3.5 },
        { line: 'দাদাকে বলব মোড়ের মাথায় গিয়ে তোমাকে বাইকে তুলে নিয়ে আসতে?', pauseSeconds: 4 },
        { line: 'বেশ, ফোন একদম কাটবে না, কথা বলতে বলতে সোজা চলে এসো।', pauseSeconds: 3.5 },
        { line: 'আমি বারান্দায় দাঁড়িয়ে রাস্তা দেখছি, বাড়ির গেট খোলাই আছে।', pauseSeconds: 3.5 },
        { line: 'হ্যাঁ দেখতে পেয়েছি, তাড়াতাড়ি সাবধানে ভেতরে চলে এসো।', pauseSeconds: 2 },
      ],
    },
  ],
  'mr-IN': [
    {
      id: 'mr_family',
      name: 'आई — कुठे पोहोचलास? (Mother check-in)',
      lines: [
        { line: 'हॅलो, कुठे पोहोचलास रे? खूप उशीर झाला आहे, काळजी वाटत होती.', pauseSeconds: 4 },
        { line: 'मेन रस्त्यानेच येतो आहेस ना? तिकडे पथदिवे चालू आहेत का?', pauseSeconds: 3.5 },
        { line: 'दादाला कॉर्नरवर गाडी घेऊन पाठवू का तुला घ्यायला?', pauseSeconds: 4 },
        { line: 'ठीक आहे, फोन चालूच ठेव आणि बोलत बोलतच सरळ घरी ये.', pauseSeconds: 3.5 },
        { line: 'मी बाल्कनीतून बघते आहे, सोसायटीचा गेट उघडाच आहे.', pauseSeconds: 3.5 },
        { line: 'हो दिसलास तू, चल पटकन आत ये सांभाळून.', pauseSeconds: 2 },
      ],
    },
  ],
};

export const FakeCallPage: React.FC = () => {
  const [calls, setCalls] = useState<FakeCallRow[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [previewingRingtone, setPreviewingRingtone] = useState<string | null>(null);

  // New call form state
  const [callerName, setCallerName] = useState('Mom');
  const [callerNumber, setCallerNumber] = useState('+91 98765 43210');
  const [avatarColor, setAvatarColor] = useState('#4338CA');
  const [delayOption, setDelayOption] = useState('30s');
  const [ringtone, setRingtone] = useState<'classic' | 'digital' | 'vibrate'>('classic');
  const [uiStyle, setUiStyle] = useState<'classic' | 'modern'>('classic');
  const [ringSeconds, setRingSeconds] = useState(30);
  const [selectedLanguage, setSelectedLanguage] = useState('en-IN');
  const [selectedScriptIdx, setSelectedScriptIdx] = useState(0);

  const navigate = useNavigate();

  const loadCalls = () => {
    apiFetch<{ calls: FakeCallRow[] }>('/api/fake-calls')
      .then((res) => setCalls(res.calls || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadCalls();
    return () => {
      audioSynthesizer.stopAll();
    };
  }, []);

  const handlePreviewRingtone = (tone: 'classic' | 'digital' | 'vibrate') => {
    if (previewingRingtone === tone) {
      audioSynthesizer.stopAll();
      setPreviewingRingtone(null);
      return;
    }

    setPreviewingRingtone(tone);
    if (tone === 'classic') audioSynthesizer.playClassicBell();
    else if (tone === 'digital') audioSynthesizer.playDigitalMelody();
    else audioSynthesizer.stopAll();

    setTimeout(() => {
      audioSynthesizer.stopAll();
      setPreviewingRingtone(null);
    }, 4000);
  };

  const handleScheduleSubmit = async (armNow = false) => {
    let delayMs = 30000;
    if (delayOption === '1m') delayMs = 60000;
    else if (delayOption === '2m') delayMs = 120000;
    else if (delayOption === '5m') delayMs = 300000;
    else if (delayOption === '10m') delayMs = 600000;

    const scheduledFor = new Date(Date.now() + delayMs).toISOString();
    const scriptsForLang = MULTILINGUAL_SCRIPTS[selectedLanguage] || MULTILINGUAL_SCRIPTS['en-IN'];
    const chosenScript = scriptsForLang[selectedScriptIdx] || scriptsForLang[0];
    const scriptJson = JSON.stringify({
      language: selectedLanguage,
      scriptName: chosenScript.name,
      lines: chosenScript.lines,
    });

    try {
      const res = await apiFetch<any>('/api/fake-calls', {
        method: 'POST',
        body: JSON.stringify({
          callerName,
          callerNumber,
          avatarColor,
          ringtone,
          uiStyle,
          scriptJson,
          scheduledFor,
          ringSeconds,
          notifyGuardian: false,
        }),
      });

      setSheetOpen(false);
      loadCalls();

      if (armNow) {
        // Unlock audio context via user gesture tap
        audioSynthesizer.unlock();
        await apiFetch(`/api/fake-calls/${res.call.id}/arm`, { method: 'POST' });
        navigate(`/app/fake-call/standby/${res.call.id}`);
      }
    } catch (err) {
      console.error('Failed to schedule fake call:', err);
    }
  };

  const handleArmExisting = async (callId: string) => {
    audioSynthesizer.unlock();
    await apiFetch(`/api/fake-calls/${callId}/arm`, { method: 'POST' });
    navigate(`/app/fake-call/standby/${callId}`);
  };

  const handleDelete = async (callId: string) => {
    await apiFetch(`/api/fake-calls/${callId}`, { method: 'DELETE' });
    loadCalls();
  };

  return (
    <>
      <Helmet>
        <title>Fake Call Generator — Raksha</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-12 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading font-bold text-2xl text-text">Fake Call Generator</h1>
            <p className="text-xs text-text-muted">
              Schedule an authentic-sounding incoming call to excuse yourself from uncomfortable situations.
            </p>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="px-4 py-2.5 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow hover:bg-primary-hover transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule New Call</span>
          </button>
        </div>

        {/* Informational Call-out */}
        <div className="p-4 bg-primary-soft/40 border border-primary/20 rounded-2xl text-xs space-y-1">
          <span className="font-semibold text-primary block">How Raksha Fake Call Works</span>
          <p className="text-text-muted leading-relaxed">
            The call rings directly inside Raksha with realistic screen graphics, custom ringtones, vibration, and multi-turn speech synthesis with natural pauses so you can reply out loud. No real telephone charges apply.
          </p>
        </div>

        {/* Scheduled / Past Calls List */}
        <div className="space-y-3">
          <h2 className="font-heading font-bold text-base text-text">Scheduled &amp; Recent Calls</h2>

          {calls.length === 0 ? (
            <EmptyState
              title="No fake calls scheduled"
              description="Schedule a call ahead of time or create a 30-second exit trigger."
              icon="phone"
              actionLabel="Schedule a Fake Call"
              onAction={() => setSheetOpen(true)}
            />
          ) : (
            <div className="space-y-2.5">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="p-4 bg-surface border border-border rounded-2xl shadow-xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: call.avatar_color }}
                    >
                      {call.caller_name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-sm text-text">
                          {call.caller_name}
                        </span>
                        {(() => {
                          try {
                            const parsed = JSON.parse(call.script_json);
                            const langKey = parsed.language || 'en-IN';
                            const turns = Array.isArray(parsed) ? parsed.length : (parsed.lines?.length || 0);
                            const langObj = LANGUAGE_OPTIONS.find((l) => l.id === langKey);
                            return (
                              <span className="px-2 py-0.5 rounded-md bg-primary-soft text-primary font-bold text-[10px]">
                                {langObj ? langObj.native : 'English'} • {turns} turns
                              </span>
                            );
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                      <div className="text-xs text-text-muted">{call.caller_number}</div>
                      <div className="text-[11px] text-text-muted mt-0.5 font-mono">
                        Scheduled: {new Date(call.scheduled_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        call.status === 'armed'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : call.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {call.status}
                    </span>

                    {call.status === 'scheduled' && (
                      <button
                        onClick={() => handleArmExisting(call.id)}
                        className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold text-xs rounded-lg hover:bg-primary-hover"
                      >
                        Arm Standby
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(call.id)}
                      className="p-1.5 text-text-muted hover:text-emergency transition-colors"
                      aria-label="Delete call"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SCHEDULE NEW CALL SHEET MODAL */}
        {sheetOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-surface border border-border rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-6 max-w-lg w-full space-y-5 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-heading font-bold text-lg text-text">Schedule Fake Call</h3>
                <button onClick={() => setSheetOpen(false)}>
                  <Square className="w-4 h-4 text-text-muted" />
                </button>
              </div>

              {/* Presets */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-text block">Caller Preset</span>
                <div className="flex flex-wrap gap-1.5">
                  {CALLER_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setCallerName(p.name);
                        setCallerNumber(p.number);
                        setAvatarColor(p.color);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        callerName === p.name
                          ? 'border-primary bg-primary-soft text-primary'
                          : 'border-border bg-surface text-text hover:bg-surface-raised'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Caller Name</label>
                  <input
                    type="text"
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={callerNumber}
                    onChange={(e) => setCallerNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-xs"
                  />
                </div>
              </div>

              {/* Timing Segmented */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-text block">Ring In</span>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {['30s', '1m', '2m', '5m'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDelayOption(d)}
                      className={`py-2 rounded-lg border font-semibold ${
                        delayOption === d
                          ? 'border-primary bg-primary-soft text-primary'
                          : 'border-border bg-surface text-text'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ringtone Selection & Preview */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-text block">Ringtone &amp; Sound</span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['classic', 'digital', 'vibrate'] as const).map((r) => (
                    <div
                      key={r}
                      className={`p-2.5 rounded-xl border flex flex-col justify-between gap-2 ${
                        ringtone === r ? 'border-primary bg-primary-soft/50' : 'border-border'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setRingtone(r)}
                        className="font-semibold text-text capitalize text-left"
                      >
                        {r}
                      </button>
                      {r !== 'vibrate' && (
                        <button
                          type="button"
                          onClick={() => handlePreviewRingtone(r)}
                          className="px-2 py-1 bg-surface border border-border rounded text-[11px] flex items-center gap-1 text-text-muted hover:text-text"
                        >
                          {previewingRingtone === r ? (
                            <>
                              <Square className="w-3 h-3 text-emergency" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 text-primary" />
                              <span>Preview</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Voice Language Selection */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-text block">Voice Language / भाषा</span>
                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    setSelectedLanguage(e.target.value);
                    setSelectedScriptIdx(0);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-xs font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {LANGUAGE_OPTIONS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label} — {l.native}
                    </option>
                  ))}
                </select>
              </div>

              {/* Script Scenario Selection */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-text block">Spoken Dialogue Scenario (5–7 turns)</span>
                <select
                  value={selectedScriptIdx}
                  onChange={(e) => setSelectedScriptIdx(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-input-bg text-xs font-medium text-text focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {(MULTILINGUAL_SCRIPTS[selectedLanguage] || MULTILINGUAL_SCRIPTS['en-IN']).map((s, idx) => (
                    <option key={s.id} value={idx}>
                      {s.name} ({s.lines.length} turns)
                    </option>
                  ))}
                </select>

                {/* Live Script Preview */}
                {(() => {
                  const currentScript =
                    (MULTILINGUAL_SCRIPTS[selectedLanguage] || MULTILINGUAL_SCRIPTS['en-IN'])[selectedScriptIdx] ||
                    (MULTILINGUAL_SCRIPTS[selectedLanguage] || MULTILINGUAL_SCRIPTS['en-IN'])[0];
                  if (!currentScript) return null;
                  return (
                    <div className="mt-2 p-3 bg-surface-raised/80 border border-border rounded-xl text-[11px] space-y-1.5 max-h-36 overflow-y-auto">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center justify-between">
                        <span>Dialogue Turns ({currentScript.lines.length} turns)</span>
                        <span className="text-primary font-mono font-medium">Conversational pauses enabled</span>
                      </div>
                      {currentScript.lines.map((l, i) => (
                        <div key={i} className="flex items-start gap-2 text-text">
                          <span className="font-mono text-primary text-[10px] shrink-0 font-bold">Turn {i + 1}:</span>
                          <span className="italic leading-tight">&ldquo;{l.line}&rdquo;</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => handleScheduleSubmit(false)}
                  className="flex-1 py-3 bg-surface border border-border rounded-xl text-xs font-semibold text-text hover:bg-surface-raised"
                >
                  Save Schedule
                </button>
                <button
                  type="button"
                  onClick={() => handleScheduleSubmit(true)}
                  className="flex-1 py-3 bg-primary text-primary-foreground font-semibold text-xs rounded-xl hover:bg-primary-hover shadow-md"
                >
                  Save &amp; Arm Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
