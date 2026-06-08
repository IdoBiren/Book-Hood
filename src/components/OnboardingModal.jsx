import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Phone, User } from 'lucide-react';

export default function OnboardingModal() {
  const { userProfile, completeProfile } = useAuth();
  
  // Helper to check if name contains Hebrew
  const hasHebrew = (str) => /[\u0590-\u05FF]/.test(str || '');
  
  // Initialize with the Google name ONLY if it contains Hebrew
  const initialName = hasHebrew(userProfile?.displayName) ? userProfile.displayName : '';
  const [displayName, setDisplayName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhoneChange = (e) => {
    // Remove all non-digit characters
    const raw = e.target.value.replace(/\D/g, '');
    // Limit to exactly 10 digits maximum
    const limited = raw.slice(0, 10);
    
    // Auto-insert dash after the 3rd digit (Israeli format: 05X-XXXXXXX)
    let formatted = limited;
    if (limited.length > 3) {
      formatted = `${limited.slice(0, 3)}-${limited.slice(3)}`;
    }
    
    setPhone(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim() || !phone.trim()) return;
    
    setIsSubmitting(true);
    try {
      await completeProfile(displayName, phone);
    } catch (err) {
      console.error(err);
      alert('אירעה שגיאה בשמירת הפרטים. אנא נסו שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(8px)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="glass-card animate-fade-in" style={{ background: '#fff', width: '100%', maxWidth: '450px', border: 'none' }}>
        <div className="text-center mb-6">
          <h2 className="mb-2">ברוכים הבאים לקהילה! 👋</h2>
          <p className="text-muted">כדי שנוכל להתחיל להשאיל ולהחליף ספרים, אנחנו צריכים להשלים שני פרטים קטנים.</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label flex items-center gap-2"><User size={18} /> שם להצגה באפליקציה</label>
            <input 
              type="text" 
              className="input-field" 
              value={displayName} 
              onChange={e => setDisplayName(e.target.value)} 
              placeholder="איך תרצו שנקרא לכם?" 
              required 
              disabled={isSubmitting}
            />
          </div>
          
          <div className="input-group mt-4">
             <label className="input-label flex items-center gap-2"><Phone size={18} /> מספר טלפון ליצירת קשר</label>
             <p className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>המספר יוצג לחברי קהילה שירצו להשאיל מכם ספר.</p>
             <input 
               type="tel" 
               className="input-field" 
               value={phone} 
               onChange={handlePhoneChange} 
               placeholder="05X-XXXXXXX" 
               pattern="^05\d-\d{7}$"
               title="יש להזין מספר פלאפון חוקי בן 10 ספרות (למשל: 050-1234567)"
               maxLength={11}
               required 
               disabled={isSubmitting}
               style={{ direction: 'ltr', textAlign: 'right' }}
             />
          </div>
          
          <button type="submit" className="btn btn-primary mt-6 w-full" disabled={isSubmitting} style={{ justifyContent: 'center' }}>
            {isSubmitting ? 'שומר פרטים...' : 'בואו נתחיל!'}
          </button>
        </form>
      </div>
    </div>
  );
}
