import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { marked } from 'marked';
import './MakeupScanner.css';

const apiKey = "AIzaSyBLlMZuAZX0J06uOkrz-kzbLVJs2EG2KHU";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

const compressImage = (file, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    };
  });
};

const renderMarkdown = (markdownText) => {
  const html = marked.parse(markdownText || '', { breaks: true });
  return <div className="analysis-content" dangerouslySetInnerHTML={{ __html: html }} />;
};

const SplashScreen = () => (
  <div className="splash-screen">
    <div className="splash-content">
      <h1 style={{ marginBottom: '0.5rem', fontSize: '3.5rem' }}>
        <span style={{ color: '#A26769' }}>BEAUTY</span>
        <span style={{ color: '#c4a77d' }}> AI</span>
        <span style={{ color: '#8a5658' }}> MATRIX</span>
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#7d6b6d', marginTop: '1rem' }}>גלי את קוד היופי שלך</p>
    </div>
  </div>
);

const areaMap = {
  brows: 'גבות',
  eyeliner: 'אייליינר',
  contour: 'קונטור/סומק',
  lips: 'שפתיים',
  eyeshadow: 'צללית',
  mascara: 'רימל',
  foundation: 'מייקאפ/בסיס'
};

const MakeupScanner = () => {
  const [base64Image, setBase64Image] = useState(null);
  const [analysisResult, setAnalysisResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const resultsRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [analysisAreas, setAnalysisAreas] = useState({
    brows: true, eyeliner: true, contour: true, lips: true, eyeshadow: true, mascara: true, foundation: true,
  });

  const loadingMessages = useMemo(() => [
    "מפענח אלגוריתמים ויזואליים",
    "סורק נקודות סימטריה",
    "מנתח גווני צבע",
    "מכין המלצות עבורך",
  ], []);

  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    const savedImage = sessionStorage.getItem('userPhoto');
    if (savedImage) {
      setBase64Image(savedImage.split(',')[1]);
    }
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let interval;
    if (isLoading) {
      let index = 0;
      interval = setInterval(() => {
        index = (index + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[index]);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading, loadingMessages]);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
      setError("אנא בחרי קובץ תמונה חוקי");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const compressedDataUrl = await compressImage(file);
      setBase64Image(compressedDataUrl.split(',')[1]);
      sessionStorage.setItem('userPhoto', compressedDataUrl);
    } catch (err) {
      setError(`שגיאה בעיבוד התמונה: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeSymmetry = useCallback(async () => {
    if (!base64Image) return;

    setIsLoading(true);
    setError(null);

    const selectedAreas = Object.keys(analysisAreas)
      .filter(key => analysisAreas[key])
      .map(key => areaMap[key]).join(', ');

    const payload = {
      contents: [{
        parts: [
          { text: `Analyze makeup symmetry for: ${selectedAreas} in Hebrew. Return a detailed markdown report.` },
          { inlineData: { mimeType: "image/jpeg", data: base64Image } }
        ]
      }],
      systemInstruction: {
        parts: [{ text: "You are a professional makeup artist AI. Analyze the image provided and give constructive feedback in Hebrew." }]
      }
    };

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error.message);
      setAnalysisResult(result.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבלה תוצאה");
    } catch (err) {
      setError(`שגיאה בחיבור לשרת ה-AI: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [base64Image, analysisAreas]);

  if (showSplash) return <SplashScreen />;

  return (
    <div className="app-container">
      <header>
        <h1>BEAUTY AI MATRIX</h1>
      </header>

      <main className="main-content-layout">
        <section className="card">
          <div className="checkbox-group">
            {Object.keys(areaMap).map(area => (
              <label key={area} className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={analysisAreas[area]} 
                  onChange={() => setAnalysisAreas(p => ({ ...p, [area]: !p[area] }))} 
                />
                <span>{areaMap[area]}</span>
              </label>
            ))}
          </div>

          <div className="upload-box">
            <input 
              type="file" 
              onChange={handleImageUpload} 
              id="image-upload" 
              className="sr-only" 
              ref={fileInputRef}
            />
            <label htmlFor="image-upload" className="upload-label">
              {base64Image ? "התמונה נשמרה במערכת" : "העלי תמונת פנים"}
            </label>
            <button 
              onClick={analyzeSymmetry} 
              className="analyze-button" 
              disabled={isLoading || !base64Image}
            >
              {isLoading ? loadingMessage : "הפעלת ניתוח"}
            </button>
          </div>
          {error && <p className="error-message" style={{color: '#ff4d4d'}}>{error}</p>}
        </section>

        {analysisResult && (
          <section className="card result-section" ref={resultsRef}>
            {renderMarkdown(analysisResult)}
          </section>
        )}
      </main>
    </div>
  );
};

export default MakeupScanner;