import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { marked } from 'marked';
import './MakeupScanner.css';

const apiKey = "AIzaSyBLlMZuAZX0J06uOkrz-kzbLVJs2EG2KHU";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const renderMarkdown = (markdownText) => {
  const html = marked.parse(markdownText || '', { breaks: true });
  return <div className="analysis-content" dangerouslySetInnerHTML={{ __html: html }} />;
};

const SplashScreen = () => (
  <div className="splash-screen">
    <div className="splash-content">
      <div className="splash-icon-container">
        <span className="splash-icon-bg" style={{fontSize: '8rem', animation: 'rotate 8s linear infinite'}}>✨</span>
      </div>
      <h1 style={{marginBottom: '0.5rem', fontSize: '3.5rem'}}>
        <span style={{color: '#A26769'}}>BEAUTY</span> 
        <span style={{color: '#c4a77d'}}> AI</span>
        <span style={{color: '#8a5658'}}> MATRIX</span>
      </h1>
      <p style={{fontSize: '1.2rem', color: '#7d6b6d', marginTop: '1rem'}}>בואי תגלי את קוד היופי המושלם שלך 💎</p>
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
  const [imageFile, setImageFile] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [analysisResult, setAnalysisResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const resultsRef = useRef(null);
  const fileInputRef = useRef(null);
  const [analysisAreas, setAnalysisAreas] = useState({
    brows: true,
    eyeliner: true,
    contour: true,
    lips: true,
    eyeshadow: true,
    mascara: true,
    foundation: true,
  });

  const loadingMessages = useMemo(() => [
    "מפענח אלגוריתמים ויזואליים ברמה גבוהה...",
    "סורק נקודות סימטריה קריטיות...",
    "מנתח גווני צבע ומרקמים...",
    "מריץ מודל Gemini Vision AI...",
    "מייצר המלצות מותאמות אישית...",
    "מכין את הדוח המקצועי שלך...",
  ], []);

  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);

  useEffect(() => {
    setTimeout(() => setShowSplash(false), 2500);
  }, []);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoadingMessage(prevMessage => {
          const currentIndex = loadingMessages.indexOf(prevMessage);
          const nextIndex = (currentIndex + 1) % loadingMessages.length;
          return loadingMessages[nextIndex];
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isLoading, loadingMessages]);

  useEffect(() => {
    if (analysisResult && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [analysisResult]);

  const openModal = () => {
    if (base64Image) setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];

    if (!file || !file.type.startsWith('image/')) {
      setError("אנא בחרי קובץ תמונה חוקי (JPEG/PNG).");
      setImageFile(null);
      setBase64Image(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`הקובץ גדול מדי! גודל הקובץ הוא ${(file.size / (1024 * 1024)).toFixed(2)}MB, המגבלה היא 4MB.`);
      setImageFile(null);
      setBase64Image(null);
      return;
    }

    setImageFile(file);
    setError(null);
    setAnalysisResult('');

    try {
      const base64 = await fileToBase64(file);
      setBase64Image(base64);
    } catch {
      setError("שגיאה בהמרת קובץ ל-Base64. אנא נסי תמונה אחרת.");
      setBase64Image(null);
      setImageFile(null);
    }
  };

  const handleCheckboxChange = (area) => {
    setAnalysisAreas(prev => ({ ...prev, [area]: !prev[area] }));
    setAnalysisResult('');
  };

  const analyzeSymmetry = useCallback(async () => {
    const selectedAreas = Object.keys(analysisAreas).filter(key => analysisAreas[key]);
    const areasListHebrew = selectedAreas.map(key => areaMap[key]).join(', ');

    if (selectedAreas.length === 0) {
      setError("אנא בחרי לפחות אזור ניתוח אחד.");
      return;
    }

    if (!base64Image) {
      setError("אנא העלי תמונה לפני ביצוע הניתוח.");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    setAnalysisResult('');

    const systemPrompt = `
      את אנליסטית סימטריית איפור מומחית.
      1. נתחי באופן יסודי את סימטריית האיפור **ברכיבים שנבחרו בלבד (${areasListHebrew})** בין שני צידי הפנים בתמונה.
      2. ספקי ציון סימטריה כללי מ-1 עד 10, והסברי את הציון בקצרה.
      3. ספקי 3-5 המלצות ממוקדות ומעשיות לשיפורים ספציפיים שניתן לבצע, תוך התמקדות ברכיבים שנבחרו.
      4. השיבי בפורמט Markdown בעברית בלבד, תוך שימוש בכותרות H2/H3 כדי לחלק את הניתוח.
    `;

    const userPrompt = `נתחי את סימטריית האיפור בתמונה המצורפת. התמקדי במציאת הבדלים קלים ברכיבים הבאים: ${areasListHebrew}.`;

    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: userPrompt },
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64Image
            }
          }
        ]
      }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.0,
        topP: 1,
        topK: 32,
        maxOutputTokens: 4096,
      },
    };

    try {
      let response = null;
      const MAX_RETRIES = 3;
      let delay = 300;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (response.status === 429 || response.status === 500 || response.status === 503) {
            if (attempt < MAX_RETRIES - 1) {
              await new Promise(resolve => setTimeout(resolve, delay + Math.random() * 200));
              delay *= 2;
              continue;
            } else {
              throw new Error("חריגה ממגבלת הקצב או שגיאת שרת מתמשכת. אנא נסי שוב מאוחר יותר.");
            }
          }

          if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error Response:", errorData);
            throw new Error(`שגיאת API: ${response.status} - ${errorData.error.message || response.statusText}`);
          }

          break;
        } catch (e) {
          if (attempt === MAX_RETRIES - 1) throw e;
          console.warn(`Attempt ${attempt + 1} failed, retrying...`, e.message);
        }
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) {
        setAnalysisResult(text);
      } else {
        setError("המודל לא סיפק תוצאת ניתוח חוקית. ייתכן שהתמונה אינה מתאימה או שיש בעיה במודל.");
      }

    } catch (e) {
      console.error("Fetch/Processing Error:", e);
      setError(`שגיאה בביצוע הניתוח: ${e.message}. בדקי שוב שה-API Key תקין, שהתמונה ברורה, ושהמודל זמין.`);
    } finally {
      setIsLoading(false);
    }
  }, [base64Image, imageFile, isLoading, analysisAreas]);

  const ImageModal = ({ imageUrl, altText, onClose }) => {
    if (!imageUrl) return null;

    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="close-button" onClick={onClose} aria-label="סגירת תצוגת תמונה">
            ×
          </button>
          <img src={imageUrl} alt={altText || "תמונה מוגדלת"} className="modal-image" />
        </div>
      </div>
    );
  };
  const resetAnalysis = useCallback(() => {
    setImageFile(null);
    setBase64Image(null);
    setAnalysisResult('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);
  if (showSplash) {
    return <SplashScreen />;
  }

  const isAnalyzeButtonDisabled = !base64Image || isLoading || Object.keys(analysisAreas).every(key => !analysisAreas[key]);

  return (
    <div className="app-container">
      <header>
        <h1 className="animate-fade-in-down" style={{marginBottom: '1.5rem'}}>
          ✨ BEAUTY AI MATRIX ✨
        </h1>
        <p style={{fontSize: '1.1rem', color: '#7d6b6d', marginBottom: '2rem', fontWeight: '500'}}>
          מערכת הניתוח המתקדמת שלך לסימטריית איפור מושלמת
        </p>
      </header>

      <div className="about-us-typing">
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem'}}>
          <span>💡</span>
          <strong>כיצד זה עובד?</strong>
          <span>💡</span>
        </div>
        <p>
          העלי תמונת פנים, בחרי את רכיבי האיפור שברצונך לנתח, ותני למערכת AI המתקדמת שלנו לסרוק כל פיקסל. 
          אנחנו מפענחים סימטריה, איזון גוונים, וטכניקות יישום כדי לתת לך דוח מקצועי עם טיפים מותאמים אישית.
        </p>
        <p style={{marginTop: '1rem', fontSize: '0.95rem', color: '#8a5658'}}>
          ✨ <strong>בעזרת Gemini Vision AI</strong> - ניתוח ברמת פיקסל בדיוק מקסימלי
        </p>
      </div>

      <main>
        <div className="main-content-layout">
          <div className="image-upload-section">
            <section className="card animate-fade-in-down">
              <h2 className="sr-only">העלאת תמונה וניתוח</h2>

              <div>
                <p className="text-lg mb-4 font-semibold dir-rtl" style={{textAlign: 'center', color: '#5c4547'}}>
                  🔎 בחרי את קוד הניתוח:
                </p>
                <div className="checkbox-group">
                  {Object.keys(areaMap).map(area => (
                    <label key={area} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={analysisAreas[area]}
                        onChange={() => handleCheckboxChange(area)}
                        disabled={isLoading}
                      />
                      <span>{areaMap[area]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="upload-box">
                <input
                  type="file"
                  accept="image/jpeg, image/png"
                  onChange={handleImageUpload}
                  id="image-upload"
                  className="sr-only"
                  disabled={isLoading}
                />
                <label htmlFor="image-upload" className="upload-label">
                  {base64Image && imageFile && (
                    <div className="w-8" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openModal(); }}>
                      <img src={`data:${imageFile.type};base64,${base64Image}`} alt="תצוגה מקדימה" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                    </div>
                  )}
                  {imageFile ? `✅ קובץ נקלט: ${imageFile.name} | החלפי תמונה` : '📸 העלי תמונת פנים'}
                </label>
                <button
                  onClick={analyzeSymmetry}
                  className="analyze-button"
                  disabled={isAnalyzeButtonDisabled}
                >
                  {isLoading ? (
                    <>
                      <span className="loading-spinner"></span>
                      מפענח נתונים... אנא המתיני לדוח!
                    </>
                  ) : '🚀 הפעלת ניתוח סימטריה מתקדם'}
                </button>
                {(analysisResult || error) && (
                  <button
                    onClick={resetAnalysis}
                    className="reset-button"
                    disabled={isLoading}
                  >
                    🔄 ניתוח חדש
                  </button>
                )}
              </div>
            </section>
          </div>

          {(analysisResult || isLoading || error || base64Image) && (
            <section ref={resultsRef} className="card results-display-section">
              <h2 className="results-title" style={{color: '#A26769'}}>
                {isLoading ? '...טוען דוח ניתוח' : error ? '🛑 תקלת מערכת' : '👑 דוח סימטריה וטיפים מותאמים'}
              </h2>

              {error && (
                <div className="error-box" style={{padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)'}}>
                  <p><strong>אירעה שגיאה:</strong> {error}</p>
                </div>
              )}

              {analysisResult && (
                <div className="results-content">
                  {renderMarkdown(analysisResult)}
                  <p className="dir-rtl mt-6 text-xs italic" style={{color: '#7d6b6d', textAlign: 'center'}}>
                    * הניתוח בוצע על ידי מודל AI מתקדם ונועד לסיוע והכוונה מקצועית בלבד.
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="card-base loading-animation-card">
                  <div className="loading-spinner"></div>
                  <h2 style={{fontSize: '1.8rem', fontWeight: '700', color: '#A26769', marginBottom: '1rem'}}>
                    AI MATRIX פעיל
                  </h2>
                  <p className="loading-message">{loadingMessage}</p>
                </div>
              )}

              {!analysisResult && !isLoading && !error && base64Image && (
                <div className="matrix-code-placeholder">
                  <span className="matrix-code-icon">⭐</span>
                  <p style={{fontSize: '1.2rem', marginTop: '1rem', color: '#A26769'}}>
                    ממתין לניתוח: אנא לחצי על 'הפעלת ניתוח' לקבלת הדוח.
                  </p>
                  <p style={{fontSize: '0.95rem', marginTop: '0.5rem', color: '#7d6b6d'}}>
                    התמונה שלך מוכנה לעיבוד ב-AI Matrix.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <footer>
        <p>פלטפורמת Beauty AI Matrix. כל הזכויות שמורות © 2025</p>
        <p style={{marginTop: '0.5rem', fontWeight: '600', color: 'var(--primary-cyan)'}}>מנוע מופעל על ידי Google Gemini.</p>
      </footer>

      {isModalOpen && base64Image && (
        <ImageModal
          imageUrl={`data:${imageFile.type};base64,${base64Image}`}
          altText={imageFile.name}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default MakeupScanner;