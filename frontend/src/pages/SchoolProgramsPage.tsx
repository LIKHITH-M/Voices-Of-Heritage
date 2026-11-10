import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import ThemeToggle from '@/components/ThemeToggle';
import VoHLogo from '@/components/VoHLogo';

// Dashboard Color Tokens
const DARK_THEME = {
  bg:      '#050505',
  surface: '#0A0A0B',
  card:    '#0F0F11',
  border:  'rgba(255, 255, 255, 0.08)',
  amber:   '#B4773B',
  gold:    '#D99C53',
  text:    '#EDEDED',
  muted:   '#8A8A8A',
};

const LIGHT_THEME = {
  bg:      '#FDFBF7',
  surface: '#FFFFFF',
  card:    '#F7F3E9',
  border:  'rgba(180, 130, 80, 0.22)',
  amber:   '#A15B17',
  gold:    '#D97706',
  text:    '#2E251E',
  muted:   '#786A5E',
};

type GradeBand = 'All' | 'Primary (Grades 1-5)' | 'Middle (Grades 6-8)' | 'Secondary (Grades 9-12)';

interface VirtualTour {
  id: string;
  title: string;
  site: string;
  duration: string;
  grades: string;
  subject: string;
  image: string;
  summary: string;
  outcomes: string[];
  curriculumLink: string;
}

interface CurriculumKit {
  id: string;
  title: string;
  gradeBand: 'Primary (Grades 1-5)' | 'Middle (Grades 6-8)' | 'Secondary (Grades 9-12)';
  subject: string;
  pages: number;
  format: string;
  icon: string;
  description: string;
  contents: string[];
  downloadsCount: number;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const VIRTUAL_TOURS: VirtualTour[] = [
  {
    id: 'tour-hampi',
    title: 'Imperial Vijayanagara & Virupaksha Waterworks',
    site: 'Hampi, Karnataka',
    duration: '45 Mins Guided Tour',
    grades: 'Grades 6 – 10',
    subject: 'Social Science & Medieval Architecture',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=900&auto=format&fit=crop&q=80',
    summary: 'Traverse the Tungabhadra aqueducts, the Queen’s Bath hydraulic engineering, and decipher the architectural acoustics of the Vittala musical stone pillars.',
    outcomes: ['Identify Vijayanagara stone masonry techniques', 'Understand medieval urban river hydrology', 'Analyze international trade links from Hampi bazaar artifacts'],
    curriculumLink: 'NCERT Class 7 (An Imperial Capital: Vijayanagara)'
  },
  {
    id: 'tour-dholavira',
    title: 'Harappan Grid Planning & Water Reservoirs',
    site: 'Dholavira, Gujarat',
    duration: '40 Mins Guided Tour',
    grades: 'Grades 6 – 9',
    subject: 'History & Ancient Civilizations',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=900&auto=format&fit=crop&q=80',
    summary: 'A virtual excavation walk through the fortified citadel, the world’s oldest known signboard, and the rainwater cascading dams of the Rann of Kutch.',
    outcomes: ['Examine bronze-age urban layout geometry', 'Discover early Indus script and seal iconography', 'Evaluate ancient flood control systems'],
    curriculumLink: 'NCERT Class 6 (In the Earliest Cities)'
  },
  {
    id: 'tour-konark',
    title: 'Sun Temple Astronomy & Solar Geometry',
    site: 'Konark, Odisha',
    duration: '50 Mins Guided Tour',
    grades: 'Grades 8 – 12',
    subject: 'Physics, Mathematics & Temple Art',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&auto=format&fit=crop&q=80',
    summary: 'Explore how 24 colossal chariot stone sundials accurately tell solar time down to the minute, examining chlorite carvings and magnetic architectural lore.',
    outcomes: ['Calculate local solar time using sundial shadow angles', 'Study Kalinga architectural proportion theorems', 'Understand ASI chemical stone preservation techniques'],
    curriculumLink: 'CBSE Secondary Mathematics & Heritage Modules'
  },
  {
    id: 'tour-ellora',
    title: 'Kailasa Temple: Monolithic Top-Down Engineering',
    site: 'Ellora, Maharashtra',
    duration: '45 Mins Guided Tour',
    grades: 'Grades 7 – 12',
    subject: 'Engineering Heritage & Art History',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&auto=format&fit=crop&q=80',
    summary: 'Step inside the largest monolithic rock excavation in the world, carved vertically downward out of a single basalt cliff face by Rashtrakuta artisans.',
    outcomes: ['Understand top-down rock excavation mechanics', 'Differentiate rock-cut cave architectures (Buddhist, Hindu, Jain)', 'Assess preservation challenges of basalt stone'],
    curriculumLink: 'NCERT Class 11 (Introduction to Indian Art)'
  }
];

const CURRICULUM_KITS: CurriculumKit[] = [
  {
    id: 'kit-1',
    title: 'Heritage Explorers: Coloring & Mythological Comic Book',
    gradeBand: 'Primary (Grades 1-5)',
    subject: 'Art & Cultural Stories',
    pages: 18,
    format: 'Printable Activity Book (PDF)',
    icon: '🎨',
    description: 'Illustrated monuments with trace-and-color temple outlines, mythological creature spotting, and interactive origami elephant stable foldouts.',
    contents: ['12 Temple Outline Coloring Sheets', 'Origami Royal Elephant Activity', 'Word Search: Ancient Dynasties', 'Sticker Badge Sheet'],
    downloadsCount: 1420
  },
  {
    id: 'kit-2',
    title: 'The Young Epigraphist: Ancient Scripts & Seal Deciphering',
    gradeBand: 'Middle (Grades 6-8)',
    subject: 'History & Languages',
    pages: 24,
    format: 'Classroom Lab Pack (PDF)',
    icon: '📜',
    description: 'Hands-on deciphering worksheets comparing Brahmi, Devanagari, and Harappan pictograms. Includes DIY clay seal stamping instructions for art classes.',
    contents: ['Brahmi Alphabet Decoder Wheel', 'Harappan Seal Mystery Cards', 'Inscriptional Rubbing Guide', 'Teacher Answer Key & Rubric'],
    downloadsCount: 2850
  },
  {
    id: 'kit-3',
    title: 'Ancient Hydrology & Water Engineering of the Deccan',
    gradeBand: 'Middle (Grades 6-8)',
    subject: 'Science & Geography',
    pages: 28,
    format: 'STEM Investigation Kit (PDF)',
    icon: '💧',
    description: 'Scientific dissection of Vijayanagara, Bawlis (Stepwells), and Chola irrigation networks with DIY mini-aqueduct building project plans.',
    contents: ['Aqueduct Gradient Cross-Sections', 'Stepwell Siphon Physics Worksheets', 'Classroom Project Guide', 'NCERT Alignment Index'],
    downloadsCount: 1980
  },
  {
    id: 'kit-4',
    title: 'Monument Conservation & ASI Fieldwork Case Studies',
    gradeBand: 'Secondary (Grades 9-12)',
    subject: 'Applied Heritage Science',
    pages: 36,
    format: 'High School Casebook (PDF)',
    icon: '🔬',
    description: 'Advanced case studies covering laser cleaning of marble at Taj Mahal, saline stone protection at Konark, and tourism carrying capacity economics.',
    contents: ['Chemical Conservation Protocols', 'Carrying Capacity Calculation Model', 'UNESCO World Heritage Nominee Framework', 'Debate Prompts for Classrooms'],
    downloadsCount: 3120
  }
];

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: 'What architectural feat makes the Kailasa Temple (Cave 16) at Ellora world-famous?',
    options: [
      'It was carved completely from the top down out of a single solid basalt cliff',
      'It was assembled using imported Italian marble blocks',
      'It was constructed underwater in a sacred lake',
      'It was built without using any foundation'
    ],
    correct: 0,
    explanation: 'Kailasa Temple at Ellora was excavated vertically top-down from a single basalt rock face, removing over 200,000 tonnes of rock.'
  },
  {
    question: 'The stone chariot in the Vittala Temple complex at Hampi represents the vehicle of which deity?',
    options: ['Lord Shiva (Nandi)', 'Lord Vishnu (Garuda)', 'Lord Brahma (Hamsa)', 'Lord Indra (Airavata)'],
    correct: 1,
    explanation: 'The iconic Stone Chariot in Hampi is actually a dedicated shrine to Garuda, the celestial eagle vehicle of Lord Vishnu.'
  },
  {
    question: 'What is unique about the ancient city of Dholavira in the Rann of Kutch?',
    options: [
      'It had a complex stone reservoir and stormwater harvesting system',
      'It was the birthplace of iron metallurgy in India',
      'It had a 10-story granite tower',
      'It had no defensive city walls'
    ],
    correct: 0,
    explanation: 'Dholavira featured one of the ancient world’s most advanced water conservation systems, with 16 massive rock-cut reservoirs to store monsoon runoff.'
  },
  {
    question: 'At the Konark Sun Temple in Odisha, what dual purpose do the 24 stone chariot wheels serve?',
    options: [
      'They function as astronomical sundials measuring exact solar time',
      'They were used to rotate the central temple spire',
      'They stored grain for temple monks',
      'They were used to grind temple medicinal herbs'
    ],
    correct: 0,
    explanation: 'The 24 wheels are intricate sundials whose spokes cast shadows that allow observers to calculate the precise solar time of day.'
  },
  {
    question: 'Which ancient Indian university possessed a 9-story library known as "Dharmaganja"?',
    options: ['Takshashila University', 'Nalanda Mahavihara', 'Vikramashila University', 'Valabhi University'],
    correct: 1,
    explanation: 'Nalanda Mahavihara in Bihar had a legendary library complex known as Dharmaganja (Treasury of Truth) housing hundreds of thousands of manuscripts.'
  }
];

export default function SchoolProgramsPage() {
  const { theme } = useTheme();
  const C = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  const [activeTab, setActiveTab] = useState<'excursions' | 'curriculum' | 'quiz' | 'booking'>('excursions');
  const [selectedGradeBand, setSelectedGradeBand] = useState<GradeBand>('All');
  const [activeTourModal, setActiveTourModal] = useState<VirtualTour | null>(null);
  
  // Interactive Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // School Booking state
  const [bookingForm, setBookingForm] = useState({
    schoolName: '',
    coordinatorName: '',
    email: '',
    phone: '',
    programType: 'Virtual Classroom Session',
    targetSite: 'Hampi & Vijayanagara Heritage',
    studentsCount: '45',
    preferredDate: '',
  });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);

  const filteredKits = CURRICULUM_KITS.filter(kit => {
    if (selectedGradeBand === 'All') return true;
    return kit.gradeBand === selectedGradeBand;
  });

  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(index);
  };

  const handleAnswerSubmit = () => {
    if (selectedOption === null) return;
    setIsAnswerSubmitted(true);
    if (selectedOption === QUIZ_QUESTIONS[quizIndex].correct) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (quizIndex < QUIZ_QUESTIONS.length - 1) {
      setQuizIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleResetQuiz = () => {
    setQuizIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setQuizScore(0);
    setQuizCompleted(false);
  };

  const triggerDownload = (kitTitle: string) => {
    setDownloadSuccessToast(`"${kitTitle}" download started! Complete PDF pack saved.`);
    setTimeout(() => setDownloadSuccessToast(null), 3500);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingSubmitted(true);
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    .school-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: ${theme === 'dark' ? 'radial-gradient(circle at 50% -20%, #151515, #050505)' : 'radial-gradient(circle at 80% 20%, rgba(247,243,233,0.4) 0%, rgba(253,251,247,0.8) 100%), ' + C.bg};
      color: ${C.text};
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
    }

    /* Topbar */
    .school-topbar {
      height: 64px;
      padding: 0 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: ${C.surface};
      border-bottom: 1px solid ${C.border};
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, ${theme === 'dark' ? '0.35' : '0.04'});
    }
    .school-brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      text-decoration: none;
    }
    .school-title {
      font-family: 'Cinzel', serif;
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: ${C.text};
      text-transform: uppercase;
      line-height: 1.1;
    }
    .school-tag {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${C.gold};
      margin-top: 2px;
    }

    /* Hero Section */
    .school-hero {
      padding: 3.5rem 2rem 2.5rem;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
      text-align: center;
    }
    .school-pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 6px 16px;
      border-radius: 9999px;
      background: rgba(217, 156, 83, 0.12);
      border: 1px solid rgba(217, 156, 83, 0.3);
      color: ${C.gold};
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 1.25rem;
    }
    .school-hero-heading {
      font-family: 'Cinzel', serif;
      font-size: 2.75rem;
      font-weight: 900;
      color: ${C.text};
      line-height: 1.2;
      margin: 0 auto 1rem;
      max-width: 850px;
    }
    .school-hero-sub {
      font-size: 1.05rem;
      color: ${C.muted};
      max-width: 720px;
      margin: 0 auto 2rem;
      line-height: 1.6;
    }

    /* Stats Ribbon */
    .school-stats-row {
      display: flex;
      justify-content: center;
      gap: 2.5rem;
      flex-wrap: wrap;
      margin-bottom: 2.5rem;
    }
    .school-stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .school-stat-val {
      font-family: 'Cinzel', serif;
      font-size: 1.6rem;
      font-weight: 800;
      color: ${C.gold};
    }
    .school-stat-label {
      font-size: 0.78rem;
      color: ${C.muted};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Navigation Tabs */
    .school-tabs-bar {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      background: ${C.surface};
      border: 1px solid ${C.border};
      padding: 6px;
      border-radius: 12px;
      max-width: 800px;
      margin: 0 auto 2.5rem;
      flex-wrap: wrap;
    }
    .school-tab-btn {
      padding: 10px 20px;
      border-radius: 8px;
      border: none;
      background: transparent;
      color: ${C.muted};
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s;
    }
    .school-tab-btn.active {
      background: linear-gradient(135deg, ${C.amber}, ${C.gold});
      color: #FFFFFF;
      box-shadow: 0 4px 14px rgba(217, 156, 83, 0.3);
    }

    /* Content Area */
    .school-content-container {
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
      padding: 0 2rem 4rem;
    }

    /* Excursions Grid */
    .excursion-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.75rem;
    }
    .excursion-card {
      background: ${C.card};
      border: 1px solid ${C.border};
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      box-shadow: 0 4px 16px rgba(0,0,0,${theme === 'dark' ? '0.3' : '0.04'});
    }
    .excursion-card:hover {
      transform: translateY(-4px);
      border-color: ${C.gold};
      box-shadow: 0 16px 36px rgba(0,0,0,${theme === 'dark' ? '0.5' : '0.1'});
    }
    .excursion-img-box {
      height: 200px;
      width: 100%;
      position: relative;
      overflow: hidden;
    }
    .excursion-img-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }
    .excursion-card:hover .excursion-img-box img {
      transform: scale(1.06);
    }
    .excursion-meta-badge {
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(5,5,5,0.85);
      border: 1px solid rgba(255,255,255,0.25);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 700;
      color: #fff;
    }
    .excursion-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      flex: 1;
      justify-content: space-between;
    }
    .excursion-title {
      font-family: 'Cinzel', serif;
      font-size: 1.2rem;
      font-weight: 800;
      color: ${C.text};
      margin: 0 0 6px;
      line-height: 1.3;
    }

    /* Primary Action Buttons */
    .school-primary-btn {
      padding: 10px 22px;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, ${C.amber}, ${C.gold});
      color: #FFFFFF;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.2s;
      box-shadow: 0 4px 14px rgba(217, 156, 83, 0.25);
    }
    .school-primary-btn:hover {
      transform: scale(1.02);
      box-shadow: 0 6px 20px rgba(217, 156, 83, 0.4);
    }

    .school-ghost-btn {
      padding: 10px 18px;
      border-radius: 8px;
      border: 1px solid ${C.border};
      background: ${C.surface};
      color: ${C.text};
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .school-ghost-btn:hover {
      border-color: ${C.gold};
      color: ${C.gold};
    }

    /* Modal */
    .school-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .school-modal-card {
      background: ${C.surface};
      border: 1px solid ${C.border};
      border-radius: 20px;
      width: 100%;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 30px 80px rgba(0,0,0,0.7);
      position: relative;
      animation: modalFade 0.25s ease-out;
    }
    @keyframes modalFade {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    /* Toast */
    .download-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #22c55e;
      color: #050505;
      font-weight: 800;
      font-size: 0.9rem;
      padding: 12px 24px;
      border-radius: 9999px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      z-index: 100000;
      animation: toastSlide 0.3s ease-out;
    }
    @keyframes toastSlide {
      from { transform: translate(-50%, 20px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }

    @media (max-width: 768px) {
      .school-hero-heading { font-size: 2rem; }
      .school-hero { padding: 2rem 1rem 1.5rem; }
      .school-content-container { padding: 0 1rem 3rem; }
      .school-stats-row { gap: 1.25rem; }
      .excursion-grid { grid-template-columns: 1fr; }
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="school-page">
        
        {/* Top Navbar */}
        <header className="school-topbar">
          <Link to="/dashboard" className="school-brand">
            <VoHLogo size={36} />
            <div>
              <div className="school-title">School Programs</div>
              <div className="school-tag">Phase 14 • Virtual Visits & Curriculum Kits</div>
            </div>
          </Link>
          <ThemeToggle />
        </header>

        {/* Hero Banner */}
        <section className="school-hero">
          <div className="school-pill-badge">
            <span>🎓</span>
            <span>CBSE & NCERT Aligned Heritage Education</span>
          </div>
          <h1 className="school-hero-heading">
            Bring India's Living Heritage into the Classroom
          </h1>
          <p className="school-hero-sub">
            Immersive virtual excursions, teacher-ready downloadable curriculum kits, and interactive archaeological quests designed to inspire the next generation of heritage custodians.
          </p>

          <div className="school-stats-row">
            <div className="school-stat-item">
              <div className="school-stat-val">1,250+</div>
              <div className="school-stat-label">Schools Enrolled</div>
            </div>
            <div className="school-stat-item">
              <div className="school-stat-val">45+</div>
              <div className="school-stat-label">NCERT Mapped Modules</div>
            </div>
            <div className="school-stat-item">
              <div className="school-stat-val">85,000+</div>
              <div className="school-stat-label">Students Reached</div>
            </div>
            <div className="school-stat-item">
              <div className="school-stat-val">100%</div>
              <div className="school-stat-label">Free Educator Access</div>
            </div>
          </div>

          {/* Section Switcher Tabs */}
          <div className="school-tabs-bar">
            <button
              className={`school-tab-btn ${activeTab === 'excursions' ? 'active' : ''}`}
              onClick={() => setActiveTab('excursions')}
            >
              🏛️ Virtual Excursions
            </button>
            <button
              className={`school-tab-btn ${activeTab === 'curriculum' ? 'active' : ''}`}
              onClick={() => setActiveTab('curriculum')}
            >
              📦 Curriculum Kits & Worksheets
            </button>
            <button
              className={`school-tab-btn ${activeTab === 'quiz' ? 'active' : ''}`}
              onClick={() => setActiveTab('quiz')}
            >
              🎯 Heritage Scholar Quiz
            </button>
            <button
              className={`school-tab-btn ${activeTab === 'booking' ? 'active' : ''}`}
              onClick={() => setActiveTab('booking')}
            >
              🏫 Book School Visit
            </button>
          </div>
        </section>

        {/* Dynamic Content Section */}
        <main className="school-content-container">

          {/* 1. VIRTUAL EXCURSIONS TAB */}
          {activeTab === 'excursions' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.4rem', color: C.text, margin: '0 0 4px' }}>
                    Interactive Classroom Field Trips
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: C.muted, margin: 0 }}>
                    Step inside ancient monuments with guided audio narrations, architectural diagrams, and curriculum learning goals.
                  </p>
                </div>
              </div>

              <div className="excursion-grid">
                {VIRTUAL_TOURS.map(tour => (
                  <div key={tour.id} className="excursion-card">
                    <div className="excursion-img-box">
                      <img src={tour.image} alt={tour.title} />
                      <div className="excursion-meta-badge">⏱️ {tour.duration}</div>
                    </div>
                    <div className="excursion-body">
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: C.gold, textTransform: 'uppercase', marginBottom: '4px' }}>
                          {tour.grades} • {tour.subject}
                        </div>
                        <h3 className="excursion-title">{tour.title}</h3>
                        <div style={{ fontSize: '0.82rem', color: C.muted, marginBottom: '10px' }}>
                          📍 {tour.site}
                        </div>
                        <p style={{ fontSize: '0.85rem', color: C.muted, lineHeight: 1.5, margin: '0 0 1rem' }}>
                          {tour.summary}
                        </p>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: C.gold, fontWeight: 700 }}>
                          ✓ {tour.curriculumLink}
                        </span>
                        <button 
                          className="school-primary-btn"
                          onClick={() => setActiveTourModal(tour)}
                        >
                          Launch Excursion →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. CURRICULUM KITS TAB */}
          {activeTab === 'curriculum' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.4rem', color: C.text, margin: '0 0 4px' }}>
                    Downloadable Curriculum Packs & Worksheets
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: C.muted, margin: 0 }}>
                    Classroom-ready printables, deciphering wheels, and archaeological investigation guides.
                  </p>
                </div>

                {/* Grade Filters */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {(['All', 'Primary (Grades 1-5)', 'Middle (Grades 6-8)', 'Secondary (Grades 9-12)'] as GradeBand[]).map(grade => (
                    <button
                      key={grade}
                      onClick={() => setSelectedGradeBand(grade)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: `1px solid ${selectedGradeBand === grade ? C.gold : C.border}`,
                        background: selectedGradeBand === grade ? 'rgba(217, 156, 83, 0.15)' : C.card,
                        color: selectedGradeBand === grade ? C.gold : C.text,
                        transition: 'all 0.2s'
                      }}
                    >
                      {grade}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                {filteredKits.map(kit => (
                  <div key={kit.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '2.2rem' }}>{kit.icon}</span>
                        <span style={{ padding: '4px 10px', borderRadius: '6px', background: C.surface, border: `1px solid ${C.border}`, fontSize: '0.75rem', fontWeight: 700, color: C.gold }}>
                          {kit.gradeBand}
                        </span>
                      </div>

                      <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.15rem', color: C.text, margin: '0 0 6px', lineHeight: 1.3 }}>
                        {kit.title}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '12px' }}>
                        {kit.format} • {kit.pages} Pages
                      </div>
                      <p style={{ fontSize: '0.85rem', color: C.muted, lineHeight: 1.5, margin: '0 0 1rem' }}>
                        {kit.description}
                      </p>

                      <div style={{ background: C.surface, padding: '10px 14px', borderRadius: '10px', border: `1px solid ${C.border}`, marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.text, marginBottom: '6px' }}>Kit Contents:</div>
                        {kit.contents.map((c, i) => (
                          <div key={i} style={{ fontSize: '0.78rem', color: C.muted, lineHeight: 1.4 }}>
                            • {c}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: '1rem' }}>
                      <span style={{ fontSize: '0.75rem', color: C.muted }}>
                        📥 {kit.downloadsCount.toLocaleString()} Educator Downloads
                      </span>
                      <button 
                        className="school-primary-btn"
                        onClick={() => triggerDownload(kit.title)}
                      >
                        Download Kit (PDF)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. STUDENT QUIZ CHALLENGE TAB */}
          {activeTab === 'quiz' && (
            <div style={{ maxWidth: '750px', margin: '0 auto', background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '2.5rem', boxShadow: `0 20px 50px rgba(0,0,0,${theme === 'dark' ? '0.4' : '0.06'})` }}>
              {!quizCompleted ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: C.gold, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Question {quizIndex + 1} of {QUIZ_QUESTIONS.length}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: C.muted, fontWeight: 700 }}>
                      Score: {quizScore} / {QUIZ_QUESTIONS.length}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: '6px', width: '100%', background: C.surface, borderRadius: '9999px', overflow: 'hidden', marginBottom: '1.75rem' }}>
                    <div style={{ height: '100%', width: `${((quizIndex + 1) / QUIZ_QUESTIONS.length) * 100}%`, background: `linear-gradient(90deg, ${C.amber}, ${C.gold})`, transition: 'width 0.3s' }} />
                  </div>

                  <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.25rem', color: C.text, lineHeight: 1.4, margin: '0 0 1.5rem' }}>
                    {QUIZ_QUESTIONS[quizIndex].question}
                  </h3>

                  {/* Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.75rem' }}>
                    {QUIZ_QUESTIONS[quizIndex].options.map((opt, optIdx) => {
                      let btnBg = C.surface;
                      let btnBorder = C.border;
                      let btnColor = C.text;

                      if (isAnswerSubmitted) {
                        if (optIdx === QUIZ_QUESTIONS[quizIndex].correct) {
                          btnBg = 'rgba(34, 197, 94, 0.15)';
                          btnBorder = '#22c55e';
                          btnColor = '#22c55e';
                        } else if (selectedOption === optIdx) {
                          btnBg = 'rgba(239, 68, 68, 0.15)';
                          btnBorder = '#ef4444';
                          btnColor = '#ef4444';
                        }
                      } else if (selectedOption === optIdx) {
                        btnBg = 'rgba(217, 156, 83, 0.15)';
                        btnBorder = C.gold;
                        btnColor = C.gold;
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectOption(optIdx)}
                          style={{
                            padding: '14px 18px',
                            borderRadius: '10px',
                            border: `1px solid ${btnBorder}`,
                            background: btnBg,
                            color: btnColor,
                            textAlign: 'left',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            cursor: isAnswerSubmitted ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s'
                          }}
                        >
                          <span>{opt}</span>
                          {isAnswerSubmitted && optIdx === QUIZ_QUESTIONS[quizIndex].correct && <span>✓ Correct</span>}
                          {isAnswerSubmitted && selectedOption === optIdx && optIdx !== QUIZ_QUESTIONS[quizIndex].correct && <span>✗ Incorrect</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation after submit */}
                  {isAnswerSubmitted && (
                    <div style={{ background: C.surface, padding: '1rem', borderRadius: '10px', border: `1px solid ${C.border}`, marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: 1.5, color: C.muted }}>
                      <strong style={{ color: C.gold, display: 'block', marginBottom: '4px' }}>💡 Archaeological Fact:</strong>
                      {QUIZ_QUESTIONS[quizIndex].explanation}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {!isAnswerSubmitted ? (
                      <button
                        className="school-primary-btn"
                        disabled={selectedOption === null}
                        onClick={handleAnswerSubmit}
                        style={{ opacity: selectedOption === null ? 0.5 : 1 }}
                      >
                        Submit Answer
                      </button>
                    ) : (
                      <button
                        className="school-primary-btn"
                        onClick={handleNextQuestion}
                      >
                        {quizIndex < QUIZ_QUESTIONS.length - 1 ? 'Next Question →' : 'View Scholar Certificate →'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* QUIZ CERTIFICATE COMPLETION */
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🏆</div>
                  <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.8rem', color: C.gold, margin: '0 0 6px' }}>
                    Heritage Scholar Quest Complete!
                  </h2>
                  <p style={{ color: C.muted, fontSize: '0.95rem', marginBottom: '2rem' }}>
                    You scored <strong>{quizScore} out of {QUIZ_QUESTIONS.length}</strong>! Generate your personalized Junior Heritage Archaeologist certificate.
                  </p>

                  <div style={{ maxWidth: '400px', margin: '0 auto 2rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: C.muted, marginBottom: '6px', textAlign: 'left' }}>
                      STUDENT OR SCHOLAR NAME
                    </label>
                    <input
                      type="text"
                      placeholder="Enter student name..."
                      value={studentName}
                      onChange={e => setStudentName(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: '1rem', fontWeight: 700, outline: 'none' }}
                    />
                  </div>

                  {/* Certificate Preview Card */}
                  <div style={{ background: C.surface, border: `2px dashed ${C.gold}`, borderRadius: '16px', padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: '0.85rem', color: C.gold, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Voices of Heritage • National Archaeological Trust
                    </div>
                    <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.4rem', color: C.text, margin: '0 0 10px' }}>
                      Certificate of Heritage Scholarship
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: C.muted }}>Awarded proudly to</div>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', fontWeight: 800, color: C.gold, margin: '8px 0' }}>
                      {studentName.trim() || 'Young Heritage Scholar'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: C.muted, maxWidth: '480px', margin: '0 auto' }}>
                      For exceptional mastery of ancient Indian monumental history, architecture, and archaeological sciences with an accuracy score of {Math.round((quizScore / QUIZ_QUESTIONS.length) * 100)}%.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="school-ghost-btn" onClick={handleResetQuiz}>
                      ↺ Retake Quiz
                    </button>
                    <button 
                      className="school-primary-btn" 
                      onClick={() => triggerDownload(`Scholar Certificate - ${studentName || 'Student'}`)}
                    >
                      Print Official Certificate
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. SCHOOL EXCURSION BOOKING TAB */}
          {activeTab === 'booking' && (
            <div style={{ maxWidth: '750px', margin: '0 auto', background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '2.5rem' }}>
              <div style={{ marginBottom: '1.75rem' }}>
                <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', color: C.text, margin: '0 0 6px' }}>
                  Institutional Group Booking Desk
                </h2>
                <p style={{ fontSize: '0.88rem', color: C.muted, margin: 0, lineHeight: 1.5 }}>
                  Book subsidized virtual guided tours or on-site ASI-certified group visits for schools and educational institutions.
                </p>
              </div>

              {bookingSubmitted ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
                  <h3 style={{ fontFamily: 'Cinzel, serif', color: C.gold, fontSize: '1.4rem', margin: '0 0 8px' }}>
                    Booking Request Received!
                  </h3>
                  <p style={{ color: C.muted, fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                    Thank you, <strong>{bookingForm.coordinatorName}</strong>. Our school relations team will contact <strong>{bookingForm.schoolName}</strong> within 24 hours with your educator access keys and preparation packs.
                  </p>
                  <button className="school-primary-btn" onClick={() => setBookingSubmitted(false)}>
                    Submit Another Booking
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>
                        SCHOOL / INSTITUTION NAME *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Kendriya Vidyalaya No. 1"
                        value={bookingForm.schoolName}
                        onChange={e => setBookingForm({ ...bookingForm, schoolName: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: C.surface, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>
                        COORDINATOR / TEACHER NAME *
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Dr. Sunita Mehra"
                        value={bookingForm.coordinatorName}
                        onChange={e => setBookingForm({ ...bookingForm, coordinatorName: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: C.surface, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>
                        OFFICIAL EMAIL *
                      </label>
                      <input
                        required
                        type="email"
                        placeholder="principal@school.edu.in"
                        value={bookingForm.email}
                        onChange={e => setBookingForm({ ...bookingForm, email: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: C.surface, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>
                        CONTACT PHONE *
                      </label>
                      <input
                        required
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={bookingForm.phone}
                        onChange={e => setBookingForm({ ...bookingForm, phone: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: C.surface, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>
                        PROGRAM FORMAT
                      </label>
                      <select
                        value={bookingForm.programType}
                        onChange={e => setBookingForm({ ...bookingForm, programType: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: C.surface, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }}
                      >
                        <option value="Virtual Classroom Session">Interactive Virtual Excursion</option>
                        <option value="On-Site ASI Heritage Tour">Physical ASI-Guided Monument Visit</option>
                        <option value="Curriculum Integration Consultation">Teacher Training Workshop</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>
                        ESTIMATED STUDENTS
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={500}
                        value={bookingForm.studentsCount}
                        onChange={e => setBookingForm({ ...bookingForm, studentsCount: e.target.value })}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: C.surface, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: C.muted, marginBottom: '6px' }}>
                      PREFERRED VISIT DATE
                    </label>
                    <input
                      type="date"
                      required
                      value={bookingForm.preferredDate}
                      onChange={e => setBookingForm({ ...bookingForm, preferredDate: e.target.value })}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: C.surface, border: `1px solid ${C.border}`, color: C.text, outline: 'none' }}
                    />
                  </div>

                  <div style={{ background: C.surface, padding: '1rem', borderRadius: '10px', border: `1px solid ${C.border}`, fontSize: '0.8rem', color: C.muted, lineHeight: 1.4 }}>
                    🔒 <strong>Educator Privilege:</strong> Virtual classroom sessions are 100% subsidized by the Voices of Heritage Foundation. Physical site entries follow ASI student concessions (free entry for students up to 15 years).
                  </div>

                  <button type="submit" className="school-primary-btn" style={{ padding: '14px', fontSize: '1rem' }}>
                    Confirm & Submit Institutional Request
                  </button>
                </form>
              )}
            </div>
          )}

        </main>

        {/* Virtual Tour Launch Modal */}
        {activeTourModal && (
          <div className="school-modal-overlay" onClick={() => setActiveTourModal(null)}>
            <div className="school-modal-card" onClick={e => e.stopPropagation()}>
              <div style={{ position: 'relative', height: '260px', width: '100%', overflow: 'hidden' }}>
                <img src={activeTourModal.image} alt={activeTourModal.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button
                  onClick={() => setActiveTourModal(null)}
                  style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}
                >
                  ×
                </button>
                <div style={{ position: 'absolute', bottom: 16, left: 20, padding: '4px 12px', borderRadius: '6px', background: 'rgba(5,5,5,0.85)', color: C.gold, fontSize: '0.8rem', fontWeight: 800 }}>
                  ⏱️ {activeTourModal.duration} • {activeTourModal.grades}
                </div>
              </div>

              <div style={{ padding: '2rem' }}>
                <div style={{ fontSize: '0.8rem', color: C.gold, fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  {activeTourModal.subject}
                </div>
                <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.5rem', color: C.text, margin: '0 0 10px' }}>
                  {activeTourModal.title}
                </h2>
                <p style={{ fontSize: '0.9rem', color: C.muted, lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  {activeTourModal.summary}
                </p>

                <div style={{ background: C.card, padding: '1.25rem', borderRadius: '12px', border: `1px solid ${C.border}`, marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', color: C.text, marginBottom: '8px' }}>
                    🎯 Curriculum Learning Objectives
                  </div>
                  {activeTourModal.outcomes.map((outcome, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: C.muted, marginBottom: '6px' }}>
                      <span style={{ color: C.gold }}>✓</span>
                      <span>{outcome}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: C.muted }}>
                    Aligned with: <strong>{activeTourModal.curriculumLink}</strong>
                  </span>
                  <button
                    className="school-primary-btn"
                    onClick={() => {
                      alert(`Launching Virtual Class Tour for "${activeTourModal.title}"! Full 3D Panorama mode activated.`);
                      setActiveTourModal(null);
                    }}
                  >
                    Start Fullscreen Classroom Tour →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Success Notification */}
        {downloadSuccessToast && (
          <div className="download-toast">
            ✓ {downloadSuccessToast}
          </div>
        )}

      </div>
    </>
  );
}
